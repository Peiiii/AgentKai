import { FileSystem, Logger, Memory, PathUtils, Vector } from '@agentkai/core';
import { platform } from '../../platform';

interface IndexedMemory {
    id: string;
    vector: Vector;
    memory: Memory;
}

/**
 * 浏览器环境下的向量索引实现
 * 使用hnswlib-wasm库提供浏览器兼容的相似向量搜索
 */
export class BrowserVectorIndex {
    private index: any = null;
    private hnswlib: any = null;
    private dimensions: number;
    private maxElements: number;
    private memories: Map<number, IndexedMemory> = new Map();
    private idToIndex: Map<string, number> = new Map();
    private indexToId: Map<number, string> = new Map();
    private currentCount: number = 0;
    private spacetype: string;
    private logger: Logger;
    private indexPath: string;
    private efConstruction: number;
    private M: number;
    private fs: FileSystem = platform.fs;
    private pathUtils: PathUtils = platform.path;
    private initialized: boolean = false;
    private indexLoaded: boolean = false;

    /**
     * 创建基于HNSW算法的浏览器兼容向量索引
     * @param dimensions 向量维度
     * @param maxElements 最大元素数量
     * @param indexPath 索引保存路径
     * @param efConstruction 构建索引时的ef参数(默认200)
     * @param M 最大出边数(默认16)
     * @param spacetype 空间类型('l2'、'ip'或'cosine'，默认'cosine')
     */
    constructor(
        dimensions: number,
        maxElements: number = 10000,
        indexPath: string = '',
        efConstruction: number = 200,
        M: number = 16,
        spacetype: string = 'cosine'
    ) {
        this.dimensions = dimensions;
        this.maxElements = maxElements;
        this.spacetype = spacetype;
        this.indexPath = indexPath;
        this.efConstruction = efConstruction;
        this.M = M;
        this.logger = new Logger('BrowserVectorIndex');
        this.fs = platform.fs;
        this.pathUtils = platform.path;

        // 动态加载hnswlib-wasm
        this.initLibrary();
    }

    /**
     * 异步初始化hnswlib-wasm库
     */
    private async initLibrary(): Promise<void> {
        try {
            this.hnswlib = await import('hnswlib-wasm');
            this.logger.info('hnswlib-wasm库加载成功');

            // 初始化索引
            await this.initIndex();
        } catch (error) {
            this.logger.error('加载hnswlib-wasm库失败:', error);
            throw new Error('无法加载浏览器向量索引库: ' + (error as Error).message);
        }
    }

    /**
     * 确保库已初始化
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            if (!this.hnswlib) {
                await this.initLibrary();
            }
            await this.initIndex();
        }
    }

    /**
     * 初始化索引
     */
    private async initIndex(): Promise<void> {
        if (this.initialized) return;

        try {
            if (!this.hnswlib) {
                this.logger.warn('hnswlib-wasm库尚未加载，正在等待...');
                return;
            }

            // 创建索引实例
            this.index = new this.hnswlib.HierarchicalNSW(this.spacetype, this.dimensions);

            // 尝试从文件加载索引
            if (this.indexPath) {
                const exists = this.hnswlib.EmscriptenFileSystemManager.checkFileExists(
                    this.indexPath
                );

                if (exists) {
                    // 如果索引文件存在，从文件加载
                    await this.loadIndex();
                } else {
                    // 否则初始化新索引
                    this.index.initIndex(this.maxElements, this.M, this.efConstruction, 100);
                    this.index.setEfSearch(Math.max(this.efConstruction, 50));
                    this.logger.info(
                        `创建新的HNSW索引，维度: ${this.dimensions}, 空间类型: ${this.spacetype}`
                    );
                }
            } else {
                // 如果没有指定索引路径，直接初始化新索引
                this.index.initIndex(this.maxElements, this.M, this.efConstruction, 100);
                this.index.setEfSearch(Math.max(this.efConstruction, 50));
                this.logger.info(
                    `创建新的HNSW索引，维度: ${this.dimensions}, 空间类型: ${this.spacetype}`
                );
            }

            this.initialized = true;
        } catch (error) {
            this.logger.error('初始化索引失败:', error);
            this.index = null;
            throw new Error('初始化向量索引失败: ' + (error as Error).message);
        }
    }

    /**
     * 添加记忆到索引
     * @param memory 记忆对象
     * @returns 是否成功添加
     */
    async addMemory(memory: Memory): Promise<boolean> {
        await this.ensureInitialized();

        if (!memory.embedding || !this.index) {
            return false;
        }

        try {
            // 如果记忆已存在，先删除旧的
            if (this.idToIndex.has(memory.id)) {
                this.removeMemory(memory.id);
            }

            // 添加到索引
            const indexId = this.currentCount;
            this.index.addPoint(memory.embedding, indexId);

            // 更新映射关系
            this.idToIndex.set(memory.id, indexId);
            this.indexToId.set(indexId, memory.id);
            this.memories.set(indexId, {
                id: memory.id,
                vector: memory.embedding,
                memory,
            });

            this.currentCount++;

            this.logger.debug(`记忆已添加到索引, ID: ${memory.id}, 索引ID: ${indexId}`);
            return true;
        } catch (error) {
            this.logger.error(`添加记忆到索引失败, ID: ${memory.id}:`, error);
            return false;
        }
    }

    /**
     * 从索引中移除记忆
     * @param id 记忆ID
     * @returns 是否成功移除
     */
    async removeMemory(id: string): Promise<boolean> {
        await this.ensureInitialized();

        if (!this.index || !this.idToIndex.has(id)) {
            return false;
        }

        try {
            const indexId = this.idToIndex.get(id)!;

            // 标记为已删除
            this.index.markDelete(indexId);

            // 从映射中移除
            this.idToIndex.delete(id);
            this.indexToId.delete(indexId);
            this.memories.delete(indexId);

            this.logger.debug(`记忆已从索引中移除, ID: ${id}, 索引ID: ${indexId}`);
            return true;
        } catch (error) {
            this.logger.error(`从索引中移除记忆失败, ID: ${id}:`, error);
            return false;
        }
    }

    /**
     * 基于向量相似度搜索记忆
     * @param vector 查询向量
     * @param limit 返回结果数量
     * @returns 相似记忆数组，按相似度降序排列
     */
    async search(vector: Vector, limit: number = 10): Promise<Memory[]> {
        await this.ensureInitialized();

        if (!this.index || this.currentCount === 0) {
            this.logger.warn('索引为空或未初始化，无法搜索');
            return [];
        }

        try {
            // 向量长度不匹配时处理
            if (vector.length !== this.dimensions) {
                this.logger.warn(
                    `查询向量维度 ${vector.length} 与索引维度 ${this.dimensions} 不匹配`
                );
                return [];
            }

            // 限制搜索结果数量不超过当前索引中的元素数量
            const numNeighbors = Math.min(limit, this.currentCount);
            if (numNeighbors === 0) return [];

            // 执行搜索
            const result = this.index.searchKnn(vector, numNeighbors);

            // 组织返回结果
            const memories: Memory[] = [];

            for (let i = 0; i < result.neighbors.length; i++) {
                const indexId = result.neighbors[i];
                const similarity = this.convertDistanceToSimilarity(result.distances[i]);

                if (this.memories.has(indexId)) {
                    const memoryData = this.memories.get(indexId)!;
                    // 克隆记忆对象并添加相似度信息
                    const memoryWithScore: Memory = {
                        ...memoryData.memory,
                        metadata: {
                            ...memoryData.memory.metadata,
                            similarity,
                        },
                    };
                    memories.push(memoryWithScore);
                }
            }

            this.logger.debug(`查询完成，返回 ${memories.length} 条结果`);
            return memories;
        } catch (error) {
            this.logger.error('向量搜索失败:', error);
            return [];
        }
    }

    /**
     * 将距离转换为相似度
     * 根据不同的空间类型，使用不同的转换方法
     */
    private convertDistanceToSimilarity(distance: number): number {
        // 余弦空间的距离是相似度的反比
        if (this.spacetype === 'cosine') {
            return 1 - distance; // 余弦距离转相似度
        }
        // 内积空间的距离就是相似度
        else if (this.spacetype === 'ip') {
            return distance; // 内积就是相似度
        }
        // L2空间（欧氏距离）需要转换成相似度
        else if (this.spacetype === 'l2') {
            // 欧氏距离转相似度：使用高斯核
            return Math.exp(-distance / 2);
        }
        // 默认情况
        return 1 - Math.min(1, distance);
    }

    /**
     * 获取所有索引中的记忆
     * @returns 所有记忆的数组
     */
    async getAllMemories(): Promise<Memory[]> {
        await this.ensureInitialized();
        return Array.from(this.memories.values()).map((item) => item.memory);
    }

    /**
     * 获取索引中的记忆数量
     * @returns 记忆数量
     */
    async getSize(): Promise<number> {
        await this.ensureInitialized();
        return this.memories.size;
    }

    /**
     * 保存索引到文件
     * @param filePath 可选的文件路径，不提供则使用构造函数的路径
     * @returns 是否成功保存
     */
    async saveIndex(filePath?: string): Promise<boolean> {
        await this.ensureInitialized();

        const indexPath = filePath || this.indexPath;

        if (!indexPath || !this.index) {
            this.logger.warn('未指定索引保存路径或索引未初始化');
            return false;
        }

        try {
            // 保存索引
            this.index.writeIndex(indexPath);

            // 准备元数据
            const metadata = {
                dimensions: this.dimensions,
                count: this.currentCount,
                spacetype: this.spacetype,
                idToIndex: Array.from(this.idToIndex.entries()),
                memories: Array.from(this.memories.entries()),
            };

            // 保存元数据
            const metadataPath = `${indexPath}.meta.json`;
            const metadataStr = JSON.stringify(metadata);
            this.hnswlib.EmscriptenFileSystemManager.writeFile(metadataPath, metadataStr);

            // 同步到持久存储
            await this.syncFileSystem('write');

            this.logger.info(`索引已保存到: ${indexPath}`);
            return true;
        } catch (error) {
            this.logger.error('保存索引失败:', error);
            return false;
        }
    }

    /**
     * 从文件加载索引
     * @param filePath 可选的文件路径，不提供则使用构造函数的路径
     * @returns 是否成功加载
     */
    async loadIndex(filePath?: string): Promise<boolean> {
        await this.ensureInitialized();

        const indexPath = filePath || this.indexPath;

        if (!indexPath || !this.index) {
            this.logger.warn('未指定索引加载路径或索引未初始化');
            return false;
        }

        if (this.indexLoaded) {
            return true;
        }

        try {
            // 从持久存储同步
            await this.syncFileSystem('read');

            // 检查索引文件是否存在
            const exists = this.hnswlib.EmscriptenFileSystemManager.checkFileExists(indexPath);
            if (!exists) {
                this.logger.warn(`索引文件不存在: ${indexPath}`);
                return false;
            }

            // 加载索引
            this.index.readIndex(indexPath, this.maxElements, true);

            // 加载元数据
            const metadataPath = `${indexPath}.meta.json`;
            const metadataExists =
                this.hnswlib.EmscriptenFileSystemManager.checkFileExists(metadataPath);

            if (metadataExists) {
                const metadataStr = this.hnswlib.EmscriptenFileSystemManager.readFile(metadataPath);
                const metadata = JSON.parse(metadataStr);

                // 恢复映射关系
                this.dimensions = metadata.dimensions;
                this.currentCount = metadata.count;
                this.spacetype = metadata.spacetype;

                this.idToIndex = new Map(metadata.idToIndex);
                this.indexToId = new Map();
                this.memories = new Map();

                // 重建索引ID到记忆ID的映射
                for (const [id, indexId] of this.idToIndex.entries()) {
                    this.indexToId.set(indexId, id);
                }

                // 重建记忆缓存
                for (const [indexId, memoryData] of metadata.memories) {
                    this.memories.set(parseInt(indexId), memoryData);
                }
            }

            this.indexLoaded = true;
            this.logger.info(
                `索引已加载，维度: ${this.dimensions}, 记忆数量: ${this.memories.size}`
            );
            return true;
        } catch (error) {
            this.logger.error('加载索引失败:', error);

            // 加载失败时重新初始化
            this.index.initIndex(this.maxElements, this.M, this.efConstruction, 100);
            this.index.setEfSearch(Math.max(this.efConstruction, 50));
            return false;
        }
    }

    /**
     * 同步文件系统
     * 将虚拟文件系统与IndexedDB同步
     * @param direction 同步方向，'read'从IndexedDB读取，'write'写入IndexedDB
     */
    private async syncFileSystem(direction: 'read' | 'write'): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.hnswlib.EmscriptenFileSystemManager.syncfs(
                    direction === 'read',
                    (err: any) => {
                        if (err) {
                            this.logger.error(`同步文件系统失败(${direction}):`, err);
                            reject(err);
                        } else {
                            this.logger.debug(`文件系统同步完成(${direction})`);
                            resolve();
                        }
                    }
                );
            } catch (error) {
                this.logger.error(`启动文件系统同步失败(${direction}):`, error);
                reject(error);
            }
        });
    }

    /**
     * 清空索引
     */
    async clear(): Promise<void> {
        await this.ensureInitialized();

        this.memories.clear();
        this.idToIndex.clear();
        this.indexToId.clear();
        this.currentCount = 0;
        this.indexLoaded = false;

        // 重新初始化索引
        if (this.index) {
            this.index.initIndex(this.maxElements, this.M, this.efConstruction, 100);
            this.index.setEfSearch(Math.max(this.efConstruction, 50));
        }

        this.logger.info('索引已清空');
    }
}
