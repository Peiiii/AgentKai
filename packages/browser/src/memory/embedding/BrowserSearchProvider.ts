import {
    EmbeddingProvider,
    ISearchProvider,
    Logger,
    Memory,
    SearchOptions,
    SearchResult,
    StorageProvider,
    Vector,
} from '@agentkai/core';

/**
 * 浏览器环境使用的搜索提供者
 * 提供基于JavaScript内存实现的向量检索功能，无需依赖外部原生库
 */
export class BrowserSearchProvider implements ISearchProvider {
    // 核心依赖
    private readonly logger: Logger;
    private readonly storage: StorageProvider<Memory>;
    private readonly embeddingProvider: EmbeddingProvider;
    
    // 配置参数
    private readonly indexName: string;
    private readonly dimensions: number;
    
    // 内部状态
    private initialized = false;
    private idToIndex = new Map<string, number>();
    private memories = new Map<number, Memory>();
    private currentCount = 0;
    
    /**
     * 创建浏览器搜索提供者
     * @param indexName 索引名称
     * @param embeddingProvider 嵌入向量提供者
     * @param storage 存储提供者，用于加载记忆
     * @param dimensions 向量维度
     */
    constructor(
        indexName: string,
        embeddingProvider: EmbeddingProvider,
        storage: StorageProvider<Memory>,
        dimensions = 1024
    ) {
        this.logger = new Logger('BrowserSearchProvider');
        this.indexName = indexName;
        this.embeddingProvider = embeddingProvider;
        this.storage = storage;
        this.dimensions = dimensions;
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
     * 重建本地索引
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        this.logger.info(`初始化浏览器搜索提供者, 索引名称: ${this.indexName}`);
        
        try {
            // 获取所有记忆并重建内存索引
            await this.rebuildIndex();
            this.initialized = true;
            this.logger.info(`浏览器搜索提供者初始化完成，当前记忆数: ${this.memories.size}`);
        } catch (error) {
            this.logger.error('初始化浏览器搜索提供者失败:', error);
            throw new Error(`初始化失败: ${(error as Error).message}`);
        }
    }

    /**
     * 添加记忆到搜索索引
     * @param memory 需要添加的记忆
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
     * 删除记忆
     * @param id 记忆ID
     */
    async deleteMemory(id: string): Promise<void> {
        await this.ensureInitialized();
        
        if (this.idToIndex.has(id)) {
            const indexId = this.idToIndex.get(id)!;
            this.idToIndex.delete(id);
            this.memories.delete(indexId);
            
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
            this.logger.warn(
                `查询向量维度 ${vector.length} 与索引维度 ${this.dimensions} 不匹配`
            );
            return { results: [] };
        }

        try {
            // 计算相似度并排序
            const results = this.computeSimilarities(vector, limit);
            
            return {
                results,
                totalCount: this.memories.size
            };
        } catch (error) {
            this.logger.error('向量搜索失败', error);
            return { results: [] };
        }
    }
    
    /**
     * 计算相似度并返回排序结果
     * @param vector 查询向量
     * @param limit 结果数量限制
     * @returns 匹配的记忆数组
     */
    private computeSimilarities(vector: Vector, limit: number): Memory[] {
        // 记录计算结果
        const similarities: Array<{memory: Memory; similarity: number}> = [];
        
        // 计算每个记忆的相似度
        for (const memory of this.memories.values()) {
            if (memory.embedding?.length === this.dimensions) {
                const similarity = this.cosineSimilarity(vector, memory.embedding);
                similarities.push({ memory, similarity });
            }
        }
        
        // 排序并取前N个结果
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        // 转换为带有相似度的Memory对象
        return similarities.slice(0, limit).map(item => ({
            ...item.memory,
            metadata: {
                ...item.memory.metadata,
                similarity: item.similarity
            }
        }));
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
            
            this.logger.info('索引已清空');
        } catch (error) {
            this.logger.error('清空索引失败', error);
        }
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
    
    /**
     * 重建索引
     * 加载所有记忆并重建内存索引
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
                memory => memory.embedding?.length === this.dimensions
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
            this.logger.info('索引重建完成');
        } catch (error) {
            this.logger.error('重建索引失败', error);
            throw error;
        }
    }
}
