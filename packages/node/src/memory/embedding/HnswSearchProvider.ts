import {
    EmbeddingProvider,
    FileSystem,
    ISearchProvider,
    Logger,
    Memory,
    PathUtils,
    SearchOptions,
    SearchResult,
    StorageProvider,
} from '@agentkai/core';
import { platform } from '../../platform';
import { HierarchicalNSW, SpaceName } from 'hnswlib-node';

/**
 * 记忆元数据接口
 */
interface MemoryMetadata {
    dimensions: number;
    count: number;
    spacetype: SpaceName;
    idToIndex: [string, number][];
    memories: [string, Memory][];
}

/**
 * HNSW搜索提供者
 *
 * 这个类使用HNSW算法提供高效的向量搜索功能。与传统实现不同，为避免与底层C++库
 * 的内存管理问题，本实现不保留索引实例，而是将记忆和其嵌入向量保存在内存中，
 * 仅在需要搜索时创建临时索引。此方法虽然每次搜索时有额外开销，但完全避免了
 * 内存泄漏和双重释放问题。
 */
export class HnswSearchProvider implements ISearchProvider {
    // 核心依赖
    private readonly embeddingProvider: EmbeddingProvider;
    private readonly logger: Logger;
    private readonly storage: StorageProvider<Memory>;
    private readonly fs: FileSystem;
    private readonly pathUtils: PathUtils;

    // 配置参数
    private readonly dataPath: string;
    private readonly indexName: string;
    private readonly metadataPath: string;
    private dimensions: number;
    private spacetype: SpaceName = 'cosine';

    // 内部状态
    private initialized = false;
    private idToIndex = new Map<string, number>();
    private memories = new Map<number, Memory>();
    private currentCount = 0;

    // 搜索参数
    private readonly efConstruction = 200;
    private readonly efSearch = 50;
    private readonly M = 16;

    /**
     * 创建HNSW搜索提供者
     * @param storage 存储提供者，用于加载记忆
     * @param embeddingProvider 嵌入向量提供者
     * @param dataPath 数据目录路径
     * @param indexName 索引名称
     */
    constructor(
        storage: StorageProvider<Memory>,
        embeddingProvider: EmbeddingProvider,
        dataPath: string,
        indexName = 'memory'
    ) {
        this.logger = new Logger('HnswSearchProvider');
        this.storage = storage;
        this.embeddingProvider = embeddingProvider;
        this.dataPath = dataPath;
        this.fs = platform.fs;
        this.pathUtils = platform.path;
        this.dimensions = embeddingProvider.getDimensions();
        this.indexName = indexName;
        this.metadataPath = this.pathUtils.join(dataPath, `${indexName}.meta.json`);
    }

    /**
     * 删除记忆
     * 实现ISearchProvider接口
     * @param id 记忆ID
     */
    async deleteMemory(id: string): Promise<void> {
        await this.ensureInitialized();

        if (this.idToIndex.has(id)) {
            const indexId = this.idToIndex.get(id)!;
            this.idToIndex.delete(id);
            this.memories.delete(indexId);

            await this.saveMetadata();
            this.logger.debug(`记忆已从索引中移除, ID: ${id}`);
        }
    }

    /**
     * 按内容搜索记忆
     * @param query 搜索查询文本
     * @param options 搜索选项
     * @returns 搜索结果
     */
    async searchByContent(query: string, options?: SearchOptions): Promise<SearchResult> {
        try {
            const vector = await this.embeddingProvider.getEmbedding(query);
            return await this.searchByVector(vector, options);
        } catch (error) {
            this.logger.error('内容搜索失败', error);
            return { results: [] };
        }
    }

    /**
     * 按向量搜索记忆
     * @param vector 搜索向量
     * @param options 搜索选项
     * @returns 搜索结果
     */
    async searchByVector(vector: number[], options?: SearchOptions): Promise<SearchResult> {
        await this.ensureInitialized();

        const limit = options?.limit || 10;
        if (this.memories.size === 0) {
            this.logger.debug('索引为空，无法搜索');
            return { results: [] };
        }

        // 验证向量维度
        if (vector.length !== this.dimensions) {
            this.logger.warn(`查询向量维度 ${vector.length} 与索引维度 ${this.dimensions} 不匹配`);
            return { results: [] };
        }

        try {
            const results = await this.searchWithTempIndex(vector, limit);
            return {
                results,
                totalCount: results.length,
            };
        } catch (error) {
            this.logger.error('向量搜索失败', error);
            return { results: [] };
        }
    }

    /**
     * 创建临时索引并执行搜索
     * @param vector 查询向量
     * @param limit 结果数量限制
     * @returns 匹配的记忆数组
     */
    private async searchWithTempIndex(vector: number[], limit: number): Promise<Memory[]> {
        const tempIndex = new HierarchicalNSW(this.spacetype, this.dimensions);
        const maxElements = Math.max(this.memories.size + 10, 100);

        try {
            // 初始化临时索引
            tempIndex.initIndex(maxElements, this.M, this.efConstruction);
            tempIndex.setEf(this.efSearch);

            // 将记忆添加到临时索引
            for (const [indexId, memory] of this.memories.entries()) {
                if (memory.embedding?.length === this.dimensions) {
                    tempIndex.addPoint(memory.embedding, indexId);
                }
            }

            // 限制结果数量
            const numNeighbors = Math.min(limit, this.memories.size);
            if (numNeighbors === 0) return [];

            // 执行KNN搜索
            const result = tempIndex.searchKnn(vector, numNeighbors);

            // 处理搜索结果
            return this.processSearchResults(result.neighbors, result.distances);
        } finally {
            // 安全释放临时索引资源
            this.releaseIndexResource(tempIndex);
        }
    }

    /**
     * 处理搜索结果
     * @param neighbors 邻居索引
     * @param distances 距离值
     * @returns 处理后的记忆数组
     */
    private processSearchResults(neighbors: number[], distances: number[]): Memory[] {
        const results: Memory[] = [];

        for (let i = 0; i < neighbors.length; i++) {
            const indexId = neighbors[i];
            const distance = distances[i];

            if (this.memories.has(indexId)) {
                const memory = this.memories.get(indexId)!;
                const similarity = this.distanceToSimilarity(distance);

                // 添加相似度信息
                results.push({
                    ...memory,
                    metadata: {
                        ...memory.metadata,
                        similarity,
                    },
                });
            }
        }

        return results;
    }

    /**
     * 将距离转换为相似度
     * @param distance 距离值
     * @returns 相似度值 (0-1)
     */
    private distanceToSimilarity(distance: number): number {
        if (this.spacetype === 'cosine') {
            return 1 - distance; // 余弦距离转相似度
        } else if (this.spacetype === 'ip') {
            return distance; // 内积就是相似度
        } else {
            // L2空间（欧氏距离）使用高斯核转换
            return Math.exp(-distance / 2);
        }
    }

    /**
     * 安全释放索引资源
     * @param index 索引实例
     */
    private releaseIndexResource(index: HierarchicalNSW): void {
        try {
            // 断开原型链引用协助垃圾回收
            // @ts-expect-error - 动态操作对象协助垃圾回收
            index.__proto__ = null;
        } catch {
            // 忽略可能的错误
        }
    }

    /**
     * 确保已初始化
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    /**
     * 初始化搜索提供者
     * 加载记忆元数据
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        this.logger.info(`初始化HNSW搜索提供者, 元数据路径: ${this.metadataPath}`);

        try {
            // 加载元数据
            await this.loadMetadata();

            // 如果没有加载到记忆，则尝试重建索引
            if (this.memories.size === 0) {
                this.logger.info('未找到有效记忆，将重建索引');
                await this.rebuildIndex();
            } else {
                this.logger.info(`成功加载元数据，包含 ${this.memories.size} 条记忆`);
            }

            this.initialized = true;
        } catch (error) {
            this.logger.error('初始化搜索提供者失败', error);
            throw error;
        }
    }

    /**
     * 添加记忆到搜索索引
     * @param memory 要添加的记忆
     */
    async addMemory(memory: Memory): Promise<void> {
        if (!memory.embedding || memory.embedding.length === 0) {
            this.logger.warn(`记忆 ${memory.id} 没有嵌入向量，无法添加`);
            return;
        }

        await this.ensureInitialized();

        try {
            // 如果记忆已存在，先删除
            if (this.idToIndex.has(memory.id)) {
                await this.deleteMemory(memory.id);
            }

            // 添加到映射
            const indexId = this.currentCount++;
            this.idToIndex.set(memory.id, indexId);
            this.memories.set(indexId, memory);

            // 保存元数据
            await this.saveMetadata();
            this.logger.debug(`记忆已添加, ID: ${memory.id}`);
        } catch (error) {
            this.logger.error(`添加记忆失败, ID: ${memory.id}:`, error);
        }
    }

    /**
     * 更新记忆
     * @param memory 更新后的记忆
     */
    async updateMemory(memory: Memory): Promise<void> {
        await this.addMemory(memory);
    }

    /**
     * 移除记忆
     * @param id 记忆ID
     */
    async removeMemory(id: string): Promise<void> {
        await this.deleteMemory(id);
    }

    /**
     * 清空索引
     */
    async clear(): Promise<void> {
        this.logger.info('清空索引');

        try {
            // 重置所有内存数据
            this.idToIndex.clear();
            this.memories.clear();
            this.currentCount = 0;

            // 保存空元数据
            await this.saveMetadata();
            this.logger.info('索引已清空');
        } catch (error) {
            this.logger.error('清空索引失败', error);
        }
    }

    /**
     * 保存元数据到文件
     */
    private async saveMetadata(): Promise<void> {
        try {
            // 确保目录存在
            const dir = this.pathUtils.dirname(this.metadataPath);
            if (!(await this.fs.exists(dir))) {
                await this.fs.mkdir(dir, { recursive: true });
            }

            // 构造元数据对象
            const metadata: MemoryMetadata = {
                dimensions: this.dimensions,
                count: this.currentCount,
                spacetype: this.spacetype,
                idToIndex: Array.from(this.idToIndex.entries()),
                memories: Array.from(this.memories.entries()).map(([id, memory]) => [
                    String(id),
                    memory,
                ]),
            };

            // 保存到文件
            await this.fs.writeFile(this.metadataPath, JSON.stringify(metadata));
            this.logger.debug(`元数据已保存到: ${this.metadataPath}`);
        } catch (error) {
            this.logger.error(`保存元数据失败:`, error);
            throw error;
        }
    }

    /**
     * 从文件加载元数据
     */
    private async loadMetadata(): Promise<void> {
        // 重置数据
        this.idToIndex.clear();
        this.memories.clear();
        this.currentCount = 0;

        // 检查文件是否存在
        if (!(await this.fs.exists(this.metadataPath))) {
            this.logger.info(`元数据文件不存在: ${this.metadataPath}`);
            return;
        }

        try {
            // 读取并解析元数据
            const metadataStr = await this.fs.readFile(this.metadataPath);
            const metadata = JSON.parse(metadataStr) as MemoryMetadata;

            // 恢复基本属性
            this.dimensions = metadata.dimensions || this.dimensions;
            this.currentCount = metadata.count || 0;
            this.spacetype = metadata.spacetype || 'cosine';

            // 恢复ID映射
            if (Array.isArray(metadata.idToIndex)) {
                this.idToIndex = new Map(metadata.idToIndex);
            }

            // 恢复记忆数据
            if (Array.isArray(metadata.memories)) {
                for (const [indexId, memory] of metadata.memories) {
                    this.memories.set(parseInt(indexId), memory);
                }
            }

            this.logger.info(`加载了 ${this.memories.size} 条记忆的元数据`);
        } catch (error) {
            this.logger.error(`加载元数据失败:`, error);
            // 确保数据一致性
            this.idToIndex.clear();
            this.memories.clear();
            this.currentCount = 0;
        }
    }

    /**
     * 重建索引
     * 加载所有记忆并重建元数据
     */
    private async rebuildIndex(): Promise<void> {
        this.logger.info('开始重建索引');

        try {
            // 清空内存数据
            this.idToIndex.clear();
            this.memories.clear();
            this.currentCount = 0;

            // 获取所有记忆
            const memories = await this.storage.list();

            // 筛选有嵌入向量的记忆
            const validMemories = memories.filter(
                (memory) => memory.embedding?.length === this.dimensions
            );

            this.logger.info(`找到 ${validMemories.length} 条有效记忆用于索引构建`);

            // 添加到内存映射
            for (let i = 0; i < validMemories.length; i++) {
                const memory = validMemories[i];
                const indexId = i;
                this.idToIndex.set(memory.id, indexId);
                this.memories.set(indexId, memory);
            }

            this.currentCount = validMemories.length;

            // 保存元数据
            await this.saveMetadata();
            this.logger.info('索引重建完成');
        } catch (error) {
            this.logger.error('重建索引失败', error);
            throw error;
        }
    }
}
