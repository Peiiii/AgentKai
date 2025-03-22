import { AISystem } from '@agentkai/core';
import { Memory } from '@agentkai/core';
import { Logger } from '@agentkai/core';

export interface MemoryCommandOptions {
    add?: string;
    search?: string;
    list?: boolean;
    remove?: string;
}

export class MemoryCommand {
    private logger: Logger;
    
    constructor(private system: AISystem) {
        this.logger = new Logger('MemoryCommand');
    }

    async execute(options: MemoryCommandOptions): Promise<void> {
        if (options.add) {
            await this.addMemory(options.add);
        }

        if (options.search) {
            await this.searchMemories(options.search);
        }

        if (options.remove) {
            await this.removeMemory(options.remove);
        }

        // 如果没有其他操作，或者显式要求列出，则显示所有记忆
        if (!options.add && !options.search && !options.remove || options.list) {
            await this.listMemories();
        }
    }

    private async addMemory(content: string): Promise<void> {
        this.logger.section('添加记忆');
        console.log(`正在添加新记忆: ${content}`);
        
        try {
            const memory = await this.system.addMemory(content, {
                type: 'manual',
                timestamp: Date.now(),
            });
            console.log('✅ 记忆已添加');
            this.logger.debug('记忆详情:', memory);
        } catch (error) {
            console.error('❌ 添加记忆失败:', error);
            throw error;
        }
    }

    private async searchMemories(query: string): Promise<void> {
        this.logger.section('搜索记忆');
        console.log(`正在搜索: "${query}"`);
        
        try {
            const memories = await this.system.searchMemories(query);
            
            if (memories.length === 0) {
                console.log('没有找到相关记忆');
                return;
            }
            
            console.log(`找到 ${memories.length} 条相关记忆`);
            
            memories.forEach((memory, index) => {
                console.log('─'.repeat(40));
                console.log(`记忆 ${index + 1}/${memories.length}:`);
                console.log(`ID: ${memory.id}`);
                console.log(`内容: ${memory.content}`);
                console.log(`日期: ${new Date(memory.createdAt).toLocaleString()}`);
                console.log(`类型: ${memory.type}`);
                
                // 显示相似度信息，如果存在
                if (memory.metadata && memory.metadata.similarity !== undefined) {
                    console.log(`相似度: ${memory.metadata.similarity.toFixed(4)}`);
                }
            });
            console.log('─'.repeat(40));
        } catch (error) {
            console.error('❌ 搜索记忆失败:', error);
            throw error;
        }
    }

    private async removeMemory(id: string): Promise<void> {
        this.logger.section('删除记忆');
        console.log(`正在删除记忆: ${id}`);
        
        try {
            await this.system.deleteMemory(id);
            console.log('✅ 记忆已删除');
        } catch (error) {
            console.error('❌ 删除记忆失败:', error);
            throw error;
        }
    }

    private async listMemories(): Promise<void> {
        this.logger.section('记忆列表');
        const memories = await this.system.getAllMemories();
        
        if (memories.length === 0) {
            console.log('没有找到记忆');
            return;
        }

        console.log(`总共有 ${memories.length} 条记忆`);
        console.log('─'.repeat(40));
        
        memories.forEach((memory: Memory, index: number) => {
            const date = new Date(memory.metadata.timestamp || 0).toLocaleString();
            console.log(`记忆 ${index + 1}/${memories.length}:`);
            console.log(`ID: ${memory.id}`);
            console.log(`内容: ${memory.content}`);
            console.log(`日期: ${date}`);
            console.log(`类型: ${memory.metadata.type || '未知'}`);
            console.log('─'.repeat(40));
        });
    }
} 