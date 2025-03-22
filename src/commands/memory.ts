import { AISystem } from '../core/AISystem';
import { Memory } from '../types';
import { Logger } from '../utils/logger';

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
        this.logger.info(`正在添加新记忆: ${content}`);
        
        try {
            const memory = await this.system.addMemory(content, {
                type: 'manual',
                timestamp: Date.now(),
            });
            this.logger.success('记忆已添加');
            this.logger.debug('记忆详情:', memory);
        } catch (error) {
            this.logger.error('添加记忆失败:', error);
            throw error;
        }
    }

    private async searchMemories(query: string): Promise<void> {
        this.logger.section('搜索记忆');
        this.logger.info(`正在搜索: "${query}"`);
        
        const memories = await this.system.searchMemories(query);
        this.logger.info(`找到 ${memories.length} 条相关记忆`);
        
        if (memories.length === 0) {
            this.logger.info('没有找到相关记忆');
            return;
        }

        this.logger.divider();
        memories.forEach((memory: Memory, index: number) => {
            const date = new Date(memory.metadata.timestamp || 0).toLocaleString();
            this.logger.info(`记忆 ${index + 1}/${memories.length}:`);
            this.logger.info(`内容: ${memory.content}`);
            this.logger.info(`日期: ${date}`);
            this.logger.info(`相似度: ${(memory as any).similarity?.toFixed(2) || '未知'}`);
            this.logger.divider();
        });
    }

    private async removeMemory(id: string): Promise<void> {
        this.logger.section('删除记忆');
        this.logger.info(`正在删除记忆: ${id}`);
        
        try {
            await this.system.deleteMemory(id);
            this.logger.success('记忆已删除');
        } catch (error) {
            this.logger.error('删除记忆失败:', error);
            throw error;
        }
    }

    private async listMemories(): Promise<void> {
        this.logger.section('记忆列表');
        const memories = await this.system.getAllMemories();
        
        if (memories.length === 0) {
            this.logger.info('没有找到记忆');
            return;
        }

        this.logger.info(`总共有 ${memories.length} 条记忆`);
        this.logger.divider();
        
        memories.forEach((memory: Memory, index: number) => {
            const date = new Date(memory.metadata.timestamp || 0).toLocaleString();
            this.logger.info(`记忆 ${index + 1}/${memories.length}:`);
            this.logger.info(`ID: ${memory.id}`);
            this.logger.info(`内容: ${memory.content}`);
            this.logger.info(`日期: ${date}`);
            this.logger.info(`类型: ${memory.metadata.type || '未知'}`);
            this.logger.divider();
        });
    }
} 