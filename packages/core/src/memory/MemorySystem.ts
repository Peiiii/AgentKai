import { Memory, MemoryType, StorageProvider } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { EmbeddingProvider } from './embedding/EmbeddingProvider';
import { Vector } from '../types';
import { HnswSearchProvider } from './embedding/HnswSearchProvider';

export class MemorySystem {
    private storage: StorageProvider;
    private logger: Logger;
    private embeddingProvider?: EmbeddingProvider;
    private searchProvider?: HnswSearchProvider;

    constructor(
        storage: StorageProvider, 
        embeddingProvider?: EmbeddingProvider, 
        searchProvider?: HnswSearchProvider
    ) {
        this.storage = storage;
        this.embeddingProvider = embeddingProvider;
        this.searchProvider = searchProvider;
        this.logger = new Logger('MemorySystem');
    }

    async createMemory(content: string, type: MemoryType = MemoryType.OBSERVATION, metadata: Record<string, any> = {}): Promise<Memory> {
        this.logger.debug('创建新记忆', { contentLength: content.length, type });
        
        let embedding: Vector | undefined = undefined;
        if (this.embeddingProvider && content.trim().length > 0) {
            try {
                embedding = await this.embeddingProvider.getEmbedding(content);
                this.logger.debug('生成记忆嵌入向量', { dimensions: embedding.length });
            } catch (error) {
                this.logger.warn('生成嵌入向量失败', error);
            }
        }

        const memory: Memory = {
            id: uuidv4(),
            content,
            type,
            createdAt: Date.now(),
            embedding,
            metadata
        };

        // 保存记忆
        await this.storage.save(memory.id, memory);
        this.logger.debug('记忆已保存', { id: memory.id });
        
        // 添加到搜索索引
        if (this.searchProvider && embedding) {
            await this.searchProvider.addMemory(memory);
        }
        
        return memory;
    }

    async getMemory(id: string): Promise<Memory | null> {
        try {
            const memory = await this.storage.get(id) as Memory | null;
            return memory;
        } catch (error) {
            this.logger.warn(`获取记忆 ${id} 失败:`, error);
            return null;
        }
    }

    async searchMemoriesByContent(query: string, limit: number = 10): Promise<Memory[]> {
        this.logger.debug('按内容搜索记忆', { query, limit });
        
        // 如果有搜索提供者，使用它
        if (this.searchProvider) {
            try {
                return await this.searchProvider.searchByContent(query, limit);
            } catch (error) {
                this.logger.warn('搜索提供者搜索失败，回退到关键词搜索', error);
            }
        }
        
        // 否则回退到简单关键词匹配
        this.logger.debug('使用关键词搜索');
        const allMemories = await this.storage.list() as Memory[];
        
        // 简单关键词匹配
        const lowerQuery = query.toLowerCase();
        const matchedMemories = allMemories
            .filter(memory => memory.content.toLowerCase().includes(lowerQuery))
            .sort((a, b) => b.createdAt - a.createdAt) // 最新的优先
            .slice(0, limit);
        
        this.logger.debug(`查找到 ${matchedMemories.length} 条记忆`);
        return matchedMemories;
    }

    async searchMemoriesByEmbedding(embedding: number[], limit: number = 10): Promise<Memory[]> {
        this.logger.debug('使用嵌入向量搜索记忆');
        
        // 如果有搜索提供者，使用它
        if (this.searchProvider) {
            return this.searchProvider.searchByVector(embedding, limit);
        }
        
        // 否则返回空结果
        this.logger.warn('没有可用的搜索提供者');
        return [];
    }

    async getRecentMemories(limit: number = 10, type?: MemoryType): Promise<Memory[]> {
        this.logger.debug('获取最近记忆', { limit, type });
        
        // 获取所有记忆
        const allMemories = await this.storage.list() as Memory[];
        
        // 根据类型过滤（如果指定了类型）
        const filteredMemories = type 
            ? allMemories.filter(memory => memory.type === type)
            : allMemories;
        
        // 按创建时间排序并截取最近的N条
        const recentMemories = filteredMemories
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
        
        this.logger.debug(`返回 ${recentMemories.length} 条最近记忆`);
        return recentMemories;
    }

    async getAllMemories(): Promise<Memory[]> {
        this.logger.debug('获取所有记忆');
        const allMemories = await this.storage.list() as Memory[];
        this.logger.debug(`总共 ${allMemories.length} 条记忆`);
        return allMemories;
    }

    async getMemoriesByType(type: MemoryType): Promise<Memory[]> {
        this.logger.debug(`获取类型为 ${type} 的记忆`);
        
        const result = await this.storage.query({ type }) as Memory[];
        this.logger.debug(`找到 ${result.length} 条类型为 ${type} 的记忆`);
        return result;
    }

    async deleteMemory(id: string): Promise<boolean> {
        this.logger.debug(`删除记忆 ${id}`);
        
        try {
            // 从索引中移除
            if (this.searchProvider) {
                this.searchProvider.removeMemory(id);
            }
            
            // 从存储中删除
            await this.storage.delete(id);
            this.logger.debug(`记忆 ${id} 已删除`);
            return true;
        } catch (error) {
            this.logger.warn(`删除记忆 ${id} 失败:`, error);
            return false;
        }
    }

    async clearAllMemories(): Promise<void> {
        this.logger.info('清空所有记忆');
        
        // 清空索引
        if (this.searchProvider) {
            this.searchProvider.clear();
        }
        
        // 清空存储
        await this.storage.clear();
    }

    async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null> {
        this.logger.debug(`更新记忆 ${id}`);
        
        try {
            const memory = await this.storage.get(id) as Memory | null;
            if (!memory) {
                this.logger.warn(`记忆 ${id} 不存在，无法更新`);
                return null;
            }
            
            // 应用更新
            const updatedMemory: Memory = {
                ...memory,
                ...updates,
                // 强制保留原始ID和创建时间
                id: memory.id,
                createdAt: memory.createdAt
            };
            
            // 如果内容被更新且有嵌入提供者，重新生成嵌入
            if (updates.content && this.embeddingProvider && updates.content !== memory.content) {
                try {
                    updatedMemory.embedding = await this.embeddingProvider.getEmbedding(updates.content);
                    this.logger.debug('已更新记忆嵌入向量');
                    
                    // 更新索引
                    if (this.searchProvider && updatedMemory.embedding) {
                        await this.searchProvider.updateMemory(updatedMemory);
                    }
                } catch (error) {
                    this.logger.warn('更新嵌入向量失败', error);
                }
            }
            
            await this.storage.save(memory.id, updatedMemory);
            this.logger.debug(`记忆 ${id} 已更新`);
            return updatedMemory;
        } catch (error) {
            this.logger.warn(`更新记忆 ${id} 失败:`, error);
            return null;
        }
    }
    
    getSearchProvider(): HnswSearchProvider | undefined {
        return this.searchProvider;
    }
} 