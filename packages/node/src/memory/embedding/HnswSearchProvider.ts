import {
    EmbeddingProvider,
    ISearchProvider,
    Logger,
    Memory,
    PathUtils,
    SearchOptions,
    SearchResult,
    StorageProvider,
} from '@agentkai/core';
import { HnswVectorIndex } from './HnswVectorIndex';
import { platform } from '../../platform';

/**
 * HNSW搜索提供者
 * 使用HNSW算法提供高效的向量搜索功能
 */
export class HnswSearchProvider implements ISearchProvider {
    private vectorIndex: HnswVectorIndex;
    private embeddingProvider: EmbeddingProvider;
    private logger: Logger;
    private storage: StorageProvider<Memory>;
    private dataPath: string;
    private initialized: boolean = false;
    private indexPath: string;
    private dimensions: number;
    private pathUtils: PathUtils;
    private indexName: string;

    /**
     * 创建HNSW搜索提供者
     * @param storage 存储提供者
     * @param embeddingProvider 嵌入提供者
     * @param dataPath 数据路径
     * @param indexName 索引名称
     */
    constructor(
        storage: StorageProvider<Memory>,
        embeddingProvider: EmbeddingProvider,
        dataPath: string = 'data',
        indexName: string = 'memory'
    ) {
        this.logger = new Logger('HnswSearchProvider');
        this.storage = storage;
        this.embeddingProvider = embeddingProvider;
        this.dataPath = dataPath;
        this.pathUtils = platform.path;
        this.dimensions = embeddingProvider.getDimensions();
        this.indexName = indexName;
        this.indexPath = this.pathUtils.join(dataPath, `${indexName}.hnsw`);

        // 创建向量索引
        this.vectorIndex = new HnswVectorIndex(
            this.dimensions,
            100000, // 最大10万条记忆
            this.indexPath
        );
    }

    /**
     * 删除记忆
     * 实现ISearchProvider接口
     * @param id 记忆ID
     */
    async deleteMemory(id: string): Promise<void> {
        // 委托给removeMemory方法实现
        this.removeMemory(id);
    }

    /**
     * 按内容搜索记忆
     * @param query 搜索查询
     * @param options 搜索选项
     * @returns 搜索结果
     */
    async searchByContent(query: string, options?: SearchOptions): Promise<SearchResult> {
        try {
            // 为查询文本生成嵌入向量
            const vector = await this.embeddingProvider.getEmbedding(query);

            // 使用向量进行搜索
            const results = await this.searchByVector(vector, options);
            return results;
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
        const limit = options?.limit || 10;

        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // 执行向量搜索
            const results = this.vectorIndex.search(vector, limit);

            // 将结果格式化为SearchResult
            return {
                results: results,
                totalCount: results.length,
            };
        } catch (error) {
            this.logger.error('向量搜索失败', error);
            return { results: [] };
        }
    }

    /**
     * 初始化搜索提供者
     * 加载现有索引，并添加已有记忆
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        this.logger.info(`初始化HNSW搜索提供者, 索引路径: ${this.indexPath}`);

        try {
            // 尝试加载现有索引
            const loadSuccess = await this.vectorIndex.saveIndex(this.indexPath);

            if (!loadSuccess) {
                this.logger.info('未找到现有索引，将创建新索引');

                // 从存储中加载所有记忆，重建索引
                await this.rebuildIndex();
            } else {
                this.logger.info('成功加载现有索引');
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
            this.logger.warn(`记忆 ${memory.id} 没有嵌入向量，无法添加到索引`);
            return;
        }

        try {
            if (!this.initialized) {
                await this.initialize();
            }
            this.vectorIndex.addMemory(memory);
            // 保存索引
            await this.vectorIndex.saveIndex();
        } catch (error) {
            this.logger.error(`添加记忆 ${memory.id} 到索引失败`, error);
        }
    }

    /**
     * 更新记忆在索引中的内容
     * @param memory 更新后的记忆
     */
    async updateMemory(memory: Memory): Promise<void> {
        // 先移除旧记忆
        this.removeMemory(memory.id);

        // 添加更新后的记忆
        await this.addMemory(memory);
    }

    /**
     * 从索引中移除记忆
     * @param id 记忆ID
     */
    removeMemory(id: string): void {
        if (!this.initialized) {
            return;
        }

        try {
            this.vectorIndex.removeMemory(id);
            // 异步保存索引，但不等待完成
            this.vectorIndex.saveIndex().catch((error: any) => {
                this.logger.error(`保存索引失败 (removeMemory)`, error);
            });
        } catch (error) {
            this.logger.error(`从索引中移除记忆 ${id} 失败`, error);
        }
    }

    /**
     * 清空索引
     */
    async clear(): Promise<void> {
        this.logger.info('清空搜索索引');

        try {
            // 重置向量索引
            this.vectorIndex = new HnswVectorIndex(this.dimensions, 100000, this.indexPath);

            // 保存空索引
            await this.vectorIndex.saveIndex();
        } catch (error) {
            this.logger.error('清空索引失败', error);
        }
    }

    /**
     * 重建索引
     * 加载所有记忆并重新构建索引
     */
    private async rebuildIndex(): Promise<void> {
        this.logger.info('开始重建索引');

        try {
            // 获取所有记忆
            const memories = await this.storage.list();

            // 筛选有嵌入向量的记忆
            const memoriesWithEmbedding = memories.filter(
                (memory) => memory.embedding && memory.embedding.length > 0
            );

            this.logger.info(`找到 ${memoriesWithEmbedding.length} 条有效记忆用于索引构建`);

            // 添加到索引
            for (const memory of memoriesWithEmbedding) {
                this.vectorIndex.addMemory(memory);
            }

            // 保存索引
            await this.vectorIndex.saveIndex();
            this.logger.info('索引重建完成');
        } catch (error) {
            this.logger.error('重建索引失败', error);
            throw error;
        }
    }
}
