import { Memory, MemoryType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { EmbeddingProvider } from './embedding/EmbeddingProvider';
import { ISearchProvider } from './embedding/ISearchProvider';
import { Storage } from '../storage/Storage';

export class MemorySystem {
    private storage: Storage<Memory>;
    private logger: Logger;
    private embeddingProvider?: EmbeddingProvider;
    private searchProvider?: ISearchProvider;

    constructor(
        storage: Storage<Memory>, 
        embeddingProvider?: EmbeddingProvider, 
        searchProvider?: ISearchProvider
    ) {
        this.storage = storage;
        this.embeddingProvider = embeddingProvider;
        this.searchProvider = searchProvider;
        this.logger = new Logger('MemorySystem');
    }


    async initialize() {
        this.logger.debug('初始化记忆系统');
        await this.searchProvider?.initialize();
    }

    // 创建新记忆
    async createMemory(content: string, type: MemoryType = MemoryType.OBSERVATION, metadata: Record<string, any> = {}): Promise<Memory> {
        this.logger.debug('创建新记忆', { content, type });
        
        // 创建新记忆对象
        const memory: Memory = {
            id: uuidv4(),
            content,
            type,
            createdAt: Date.now(),
            metadata
        };
        
        // 如果有嵌入提供者，生成嵌入向量
        if (this.embeddingProvider) {
            try {
                this.logger.debug('为记忆生成嵌入向量');
                memory.embedding = await this.embeddingProvider.getEmbedding(content);
            } catch (error) {
                this.logger.error('嵌入向量生成失败', { error });
            }
        }
        
        // 如果有搜索提供者，将记忆添加到搜索索引
        if (this.searchProvider && memory.embedding) {
            try {
                this.logger.debug('将记忆添加到搜索索引');
                await this.searchProvider.addMemory(memory);
            } catch (error) {
                this.logger.error('添加记忆到搜索索引失败', { error });
            }
        }
        
        // 保存记忆
        await this.storage.save(memory.id, memory);
        this.logger.debug('记忆已保存', { id: memory.id });
        
        return memory;
    }

    // 获取特定记忆
    async getMemory(id: string): Promise<Memory | null> {
        try {
            const memory = await this.storage.get(id) as Memory | null;
            return memory;
        } catch (error) {
            this.logger.error(`获取记忆失败: ${id}`, { error });
            return null;
        }
    }

    // 搜索相关记忆
    async searchMemories(query: string, limit: number = 5): Promise<Memory[]> {
        this.logger.debug('搜索记忆', { query, limit });
        
        // 如果有搜索提供者，使用向量搜索
        if (this.searchProvider && this.embeddingProvider) {
            try {
                this.logger.debug('使用向量搜索');
                // 生成查询向量
                const queryEmbedding = await this.embeddingProvider.getEmbedding(query);
                // 搜索相似记忆
                const searchResult = await this.searchProvider.searchByVector(queryEmbedding, { limit });
                
                this.logger.debug(`找到 ${searchResult.results.length} 条相关记忆`);
                return searchResult.results;
            } catch (error) {
                this.logger.error('向量搜索失败', { error });
                // 如果向量搜索失败，回退到关键词搜索
            }
        }
        
        // 否则回退到简单关键词匹配
        this.logger.debug('使用关键词搜索');
        const allMemories = await this.storage.list() as Memory[];
        
        // 简单关键词匹配
        const results = allMemories
            .filter(memory => memory.content.toLowerCase().includes(query.toLowerCase()))
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
        
        this.logger.debug(`找到 ${results.length} 条相关记忆`);
        return results;
    }

    // 按类型搜索记忆
    async searchMemoriesByType(query: string, type: MemoryType, limit: number = 5): Promise<Memory[]> {
        this.logger.debug(`按类型搜索记忆: ${type}`, { query, limit });
        
        // 获取所有记忆
        const allMemories = await this.storage.list() as Memory[];
        
        // 根据类型过滤（如果指定了类型）
        const filteredMemories = allMemories.filter(memory => memory.type === type);
        
        // 搜索结果按创建时间倒序排列并限制数量
        return filteredMemories
            .filter(memory => memory.content.toLowerCase().includes(query.toLowerCase()))
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
    }

    // 获取所有记忆
    async getAllMemories(): Promise<Memory[]> {
        this.logger.debug('获取所有记忆');
        const allMemories = await this.storage.list() as Memory[];
        this.logger.debug(`总共 ${allMemories.length} 条记忆`);
        return allMemories;
    }
    

    async getRecentMemories(limit: number = 5): Promise<Memory[]> {
        this.logger.debug('获取最近记忆', { limit });
        const allMemories = await this.storage.list() as Memory[];
        this.logger.debug(`总共 ${allMemories.length} 条记忆`);
        return allMemories.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    }

    // 按类型获取记忆
    async getMemoriesByType(type: MemoryType): Promise<Memory[]> {
        this.logger.debug(`获取类型为 ${type} 的记忆`);
        
        const result = await this.storage.query({ filter: { type } }) as Memory[];
        this.logger.debug(`找到 ${result.length} 条类型为 ${type} 的记忆`);
        return result;
    }

    // 删除记忆
    async deleteMemory(id: string): Promise<boolean> {
        try {
            this.logger.debug(`删除记忆: ${id}`);
            
            // 如果有搜索提供者，从搜索索引中删除
            if (this.searchProvider) {
                try {
                    await this.searchProvider.deleteMemory(id);
                    this.logger.debug(`记忆 ${id} 已从搜索索引中删除`);
                } catch (error) {
                    this.logger.error(`从搜索索引删除记忆失败: ${id}`, { error });
                    // 继续尝试从存储中删除
                }
            }
            
            // 从存储中删除
            await this.storage.delete(id);
            this.logger.debug(`记忆 ${id} 已删除`);
            return true;
        } catch (error) {
            this.logger.error(`删除记忆失败: ${id}`, { error });
            return false;
        }
    }

    // 清空所有记忆
    async clearMemories(): Promise<void> {
        this.logger.debug('清空所有记忆');
        
        // 如果有搜索提供者，清空搜索索引
        if (this.searchProvider) {
            try {
                await this.searchProvider.clear();
                this.logger.debug('搜索索引已清空');
            } catch (error) {
                this.logger.error('清空搜索索引失败', { error });
                // 继续尝试清空存储
            }
        }
        
        // 清空存储
        await this.storage.clear();
    }

    // 更新记忆内容
    async updateMemory(id: string, content: string, metadata?: Record<string, any>): Promise<Memory | null> {
        this.logger.debug(`更新记忆: ${id}`, { content });
        
        try {
            const memory = await this.storage.get(id) as Memory | null;
            if (!memory) {
                this.logger.warn(`记忆 ${id} 不存在，无法更新`);
                return null;
            }
            
            const updatedMemory: Memory = {
                ...memory,
                content,
                metadata: metadata ? { ...memory.metadata, ...metadata } : memory.metadata
            };
            
            // 如果内容变更且有嵌入提供者，重新生成嵌入向量
            if (content !== memory.content && this.embeddingProvider) {
                try {
                    this.logger.debug('为更新的记忆重新生成嵌入向量');
                    updatedMemory.embedding = await this.embeddingProvider.getEmbedding(content);
                    
                    // 如果有搜索提供者，更新搜索索引
                    if (this.searchProvider && updatedMemory.embedding) {
                        await this.searchProvider.updateMemory(updatedMemory);
                        this.logger.debug(`记忆 ${id} 在搜索索引中已更新`);
                    }
                } catch (error) {
                    this.logger.error('更新记忆的嵌入向量生成失败', { error });
                }
            }
            
            await this.storage.save(memory.id, updatedMemory);
            this.logger.debug(`记忆 ${id} 已更新`);
            return updatedMemory;
        } catch (error) {
            this.logger.error(`更新记忆失败: ${id}`, { error });
            return null;
        }
    }
} 