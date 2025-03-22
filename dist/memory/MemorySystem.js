"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySystem = void 0;
const FileSystemStorage_1 = require("../storage/FileSystemStorage");
const uuid_1 = require("uuid");
const hnswlib_node_1 = require("hnswlib-node");
const logger_1 = require("../utils/logger");
class MemorySystem {
    constructor(config, model, storage) {
        this.memories = [];
        this.config = config;
        this.model = model;
        this.storage = storage || new FileSystemStorage_1.FileSystemStorage();
        this.vectorDb = new hnswlib_node_1.HierarchicalNSW('cosine', config.vectorDimensions);
        this.vectorDb.initIndex(config.maxMemories);
        this.logger = new logger_1.Logger('MemorySystem');
    }
    async initialize() {
        try {
            this.logger.info('开始加载记忆...');
            const savedMemories = await this.storage.loadMemories();
            this.memories = savedMemories;
            this.logger.info(`已加载 ${this.memories.length} 条记忆`);
            // 重建向量索引
            this.logger.info('开始重建向量索引...');
            this.vectorDb = new hnswlib_node_1.HierarchicalNSW('cosine', this.config.vectorDimensions);
            this.vectorDb.initIndex(this.config.maxMemories);
            let validMemories = 0;
            for (let i = 0; i < this.memories.length; i++) {
                const embedding = this.memories[i].embedding;
                if (embedding) {
                    this.vectorDb.addPoint(embedding, i);
                    validMemories++;
                }
            }
            this.logger.info(`向量索引重建完成，有效记忆数: ${validMemories}`);
        }
        catch (error) {
            this.logger.warn('加载记忆时出错，将使用空记忆列表:', error);
            this.memories = [];
        }
    }
    async addMemory(content, metadata) {
        try {
            this.logger.info('开始添加新记忆...');
            this.logger.debug(`记忆内容: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
            this.logger.debug(`记忆类型: ${metadata.type || 'event'}`);
            this.logger.debug(`当前记忆总数: ${this.memories.length}`);
            // 生成嵌入向量
            const embedding = await this.model.generateEmbedding(content);
            // 计算重要性（如果没有提供）
            if (metadata.importance === undefined) {
                metadata.importance = this.calculateImportance(content, metadata);
            }
            // 创建记忆对象
            const memory = {
                id: (0, uuid_1.v4)(),
                content,
                embedding,
                timestamp: metadata.timestamp || Date.now(),
                importance: metadata.importance || 0.5,
                type: metadata.type || 'fact',
                metadata
            };
            // 如果是对话记忆，处理分组
            if (metadata.type === 'conversation' && metadata.conversationId) {
                this.logger.debug(`检测到对话记忆，对话ID: ${metadata.conversationId}`);
                // 检查是否存在同一对话的其他记忆，如果有，关联它们
                const conversationGroup = this.memories.find(m => m.metadata.conversationGroupId &&
                    m.metadata.conversations?.includes(metadata.conversationId));
                if (conversationGroup) {
                    this.logger.debug(`已关联到现有对话组: ${conversationGroup.id}`);
                    conversationGroup.metadata.conversations.push(metadata.conversationId);
                }
            }
            // 添加记忆
            this.memories.push(memory);
            this.logger.debug(`添加后记忆总数: ${this.memories.length}`);
            // 保存到存储
            await this.saveMemories();
            this.logger.debug('记忆已保存到存储');
            // 更新向量索引
            this.vectorDb.addPoint(embedding, this.memories.length - 1);
            this.logger.debug('向量索引已更新');
            // 如果记忆超过上限，执行清理
            await this.pruneMemories();
            this.logger.info('记忆添加完成');
        }
        catch (error) {
            this.logger.error('添加记忆失败:', error);
            throw error;
        }
    }
    calculateImportance(content, metadata) {
        // 基础重要性
        let importance = metadata.importance || 0.5;
        // 根据内容长度调整
        const contentLength = content.length;
        if (contentLength > 500)
            importance += 0.1;
        if (contentLength > 1000)
            importance += 0.1;
        // 根据类型调整
        if (metadata.type === 'conversation') {
            importance += 0.2;
        }
        // 确保重要性在0-1之间
        return Math.max(0, Math.min(1, importance));
    }
    async pruneMemories() {
        if (this.memories.length > this.config.maxMemories) {
            this.logger.info('开始清理记忆，当前数量:', this.memories.length);
            // 按重要性排序
            this.memories.sort((a, b) => b.importance - a.importance);
            // 保留重要的记忆
            const importantMemories = this.memories.slice(0, this.config.maxMemories * 0.7);
            this.logger.info('保留重要记忆数量:', importantMemories.length);
            // 对于不重要的记忆，按时间排序保留最近的
            const recentMemories = this.memories
                .slice(this.config.maxMemories * 0.7)
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, this.config.maxMemories * 0.3);
            this.logger.info('保留最近记忆数量:', recentMemories.length);
            this.memories = [...importantMemories, ...recentMemories];
            this.logger.info('清理后总记忆数量:', this.memories.length);
            // 重建向量索引
            this.vectorDb = new hnswlib_node_1.HierarchicalNSW('cosine', this.config.vectorDimensions);
            this.vectorDb.initIndex(this.config.maxMemories);
            for (let i = 0; i < this.memories.length; i++) {
                const embedding = this.memories[i].embedding;
                if (embedding) {
                    this.vectorDb.addPoint(embedding, i);
                }
            }
            this.logger.info('向量索引已重建');
        }
        else {
            this.logger.info('记忆数量未达到上限，无需清理');
        }
    }
    async saveMemories() {
        try {
            await this.storage.saveMemories(this.memories);
        }
        catch (error) {
            this.logger.error('Failed to save memories:', error);
        }
    }
    async searchMemories(query, limit = 5) {
        try {
            if (!query || query.trim() === '') {
                this.logger.info('搜索查询为空，返回空结果');
                return [];
            }
            this.logger.info(`开始搜索记忆: "${query}"`);
            this.logger.info(`当前记忆总数: ${this.memories.length}`);
            const queryEmbedding = await this.model.generateEmbedding(query);
            this.logger.info('已生成查询向量');
            // 使用向量数据库搜索
            const searchResults = this.vectorDb.searchKnn(queryEmbedding, limit);
            this.logger.info(`向量搜索完成，找到 ${searchResults.neighbors.length} 个结果`);
            const results = [];
            for (let i = 0; i < searchResults.neighbors.length; i++) {
                const index = searchResults.neighbors[i];
                const similarity = 1 - searchResults.distances[i]; // 转换为相似度（1减去cosine距离）
                const memory = this.memories[index];
                // 仅调试输出关键信息
                this.logger.debug(`候选记忆: "${memory.content.substring(0, 50)}${memory.content.length > 50 ? '...' : ''}" 相似度: ${similarity.toFixed(4)}`);
                // 相似度越高越好，所以用大于等于
                if (similarity >= this.config.similarityThreshold) {
                    if (memory) {
                        results.push(memory);
                        this.logger.info(`找到相关记忆:
    - 内容: ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}
    - 相似度: ${similarity.toFixed(4)}
    - 时间: ${new Date(memory.timestamp).toLocaleString()}`);
                    }
                }
            }
            this.logger.info(`搜索完成，返回 ${results.length} 条结果`);
            return results;
        }
        catch (error) {
            this.logger.error('搜索记忆失败:', error);
            return [];
        }
    }
    async getAllMemories() {
        return [...this.memories].sort((a, b) => b.timestamp - a.timestamp);
    }
    async deleteMemory(id) {
        this.logger.info(`删除记忆 ${id}`);
        const index = this.memories.findIndex(m => m.id === id);
        if (index === -1) {
            throw new Error(`记忆 ${id} 不存在`);
        }
        this.memories.splice(index, 1);
        await this.saveMemories();
        this.logger.info('记忆已删除');
    }
    async clearMemories() {
        this.logger.info('清空所有记忆');
        this.memories = [];
        this.vectorDb = new hnswlib_node_1.HierarchicalNSW('cosine', this.config.vectorDimensions);
        this.vectorDb.initIndex(this.config.maxMemories);
        await this.storage.clear();
        this.logger.info('所有记忆已清空');
    }
}
exports.MemorySystem = MemorySystem;
