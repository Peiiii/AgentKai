"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCommand = void 0;
const logger_1 = require("../utils/logger");
class MemoryCommand {
    constructor(system) {
        this.system = system;
        this.logger = new logger_1.Logger('MemoryCommand');
    }
    async execute(options) {
        if (options.add) {
            await this.addMemory(options.add);
        }
        if (options.search) {
            await this.searchMemories(options.search);
        }
        if (options.remove) {
            await this.removeMemory(options.remove);
        }
        if (options.list) {
            await this.listMemories();
        }
    }
    async addMemory(content) {
        this.logger.info('添加记忆', { content: content.substring(0, 50) + (content.length > 50 ? '...' : '') });
        await this.system.addMemory(content, {
            type: 'event',
            importance: 0.5,
            timestamp: Date.now(),
        });
        this.logger.info('记忆已添加');
        // 用户界面输出
        console.log('记忆已添加成功');
    }
    async searchMemories(query) {
        const searchQuery = query.trim();
        if (!searchQuery) {
            throw new Error('搜索内容不能为空');
        }
        this.logger.info('开始搜索', { query: searchQuery });
        const memories = await this.system.searchMemories(searchQuery);
        this.displayMemories(memories, '搜索结果');
    }
    async listMemories() {
        this.logger.info('获取所有记忆');
        const memories = await this.system.getAllMemories();
        this.displayMemories(memories, '所有记忆');
    }
    async removeMemory(id) {
        this.logger.info('删除记忆', { id });
        await this.system.deleteMemory(id);
        this.logger.info('记忆已删除');
        // 用户界面输出
        console.log('记忆已成功删除');
    }
    displayMemories(memories, title) {
        console.log(`\n${title}:`);
        console.log('----------------------------------------');
        if (memories.length === 0) {
            console.log('没有找到记忆。');
            return;
        }
        memories.forEach((memory, index) => {
            console.log(`记忆 ${index + 1}:`);
            console.log(`内容: ${memory.content}`);
            console.log(`类型: ${memory.type}`);
            console.log(`重要性: ${memory.importance}`);
            console.log(`时间: ${new Date(memory.timestamp).toLocaleString()}`);
            console.log('----------------------------------------');
        });
    }
}
exports.MemoryCommand = MemoryCommand;
