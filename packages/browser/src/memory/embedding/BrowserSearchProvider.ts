import {
    EmbeddingProvider,
    ISearchProvider,
    Logger,
    Memory,
    SearchOptions,
    SearchResult,
    StorageProvider,
} from '@agentkai/core';

/**
 * 浏览器环境使用的搜索提供者
 * 基于IndexedDB实现向量检索
 */
export class BrowserSearchProvider implements ISearchProvider {
    private logger: Logger;
    private indexName: string;
    private embeddingProvider: EmbeddingProvider;
    private storage: StorageProvider<Memory>;
    private initialized: boolean = false;
    private dimensions: number;

    /**
     * 创建浏览器搜索提供者
     * @param indexName 索引名称
     * @param embeddingProvider 嵌入提供者
     * @param storage 存储对象
     * @param dimensions 向量维度
     */
    constructor(
        indexName: string,
        embeddingProvider: EmbeddingProvider,
        storage: StorageProvider<Memory>,
        dimensions: number = 1024
    ) {
        this.logger = new Logger('BrowserSearchProvider');
        this.indexName = indexName;
        this.embeddingProvider = embeddingProvider;
        this.storage = storage;
        this.dimensions = dimensions;
    }

    /**
     * 初始化搜索提供者
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        this.logger.info('初始化浏览器搜索提供者');
        this.initialized = true;
    }

    /**
     * 添加记忆到索引
     * @param memory 需要添加的记忆
     */
    async addMemory(memory: Memory): Promise<void> {
        if (!memory.embedding || memory.embedding.length === 0) {
            this.logger.warn(`记忆 ${memory.id} 没有嵌入向量，无法添加到索引`);
            return;
        }

        // 浏览器搜索提供者实际上没有单独的索引
        // 记忆的embedding已经存储在memory对象中，由storage负责持久化
        this.logger.debug(`记忆 ${memory.id} 已添加到浏览器搜索提供者`);
    }

    /**
     * 更新记忆
     * @param memory 更新后的记忆
     */
    async updateMemory(memory: Memory): Promise<void> {
        // 与添加相同，浏览器搜索提供者不需要额外操作
        this.logger.debug(`记忆 ${memory.id} 已在浏览器搜索提供者中更新`);
    }

    /**
     * 删除记忆
     * @param id 记忆ID
     */
    async deleteMemory(id: string): Promise<void> {
        this.logger.debug(`记忆 ${id} 已从浏览器搜索提供者中删除`);
    }

    /**
     * 根据内容搜索记忆
     * @param query 查询内容
     * @param options 搜索选项
     */
    async searchByContent(query: string, options?: SearchOptions): Promise<SearchResult> {
        try {
            // 为查询文本生成嵌入向量
            const vector = await this.embeddingProvider.getEmbedding(query);

            // 使用向量搜索
            return this.searchByVector(vector, options);
        } catch (error) {
            this.logger.error('内容搜索失败', error);
            return { results: [] };
        }
    }

    /**
     * 根据向量搜索记忆
     * @param vector 查询向量
     * @param options 搜索选项
     */
    async searchByVector(vector: number[], options?: SearchOptions): Promise<SearchResult> {
        try {
            const limit = options?.limit || 10;

            // 获取所有记忆
            const memories = await this.storage.list();

            // 计算余弦相似度并排序
            const results = memories
                .filter((memory) => memory.embedding && memory.embedding.length > 0)
                .map((memory) => {
                    const similarity = this.cosineSimilarity(vector, memory.embedding!);
                    return {
                        ...memory,
                        metadata: { ...memory.metadata, similarity },
                    };
                })
                .sort((a, b) => {
                    const simA = a.metadata?.similarity || 0;
                    const simB = b.metadata?.similarity || 0;
                    return simB - simA; // 降序排列
                })
                .slice(0, limit);

            return {
                results,
                totalCount: memories.length,
            };
        } catch (error) {
            this.logger.error('向量搜索失败', error);
            return { results: [] };
        }
    }

    /**
     * 清空索引
     */
    async clear(): Promise<void> {
        this.logger.info('清空浏览器搜索索引');
        // 浏览器搜索提供者没有单独的索引，由storage负责清空
    }

    /**
     * 计算两个向量的余弦相似度
     * @param vecA 向量A
     * @param vecB 向量B
     * @returns 相似度值（0-1之间）
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            this.logger.warn(`向量维度不匹配: ${vecA.length} vs ${vecB.length}`);
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }
}
