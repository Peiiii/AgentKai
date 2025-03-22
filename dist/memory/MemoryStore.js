"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
const hnswlib_node_1 = require("hnswlib-node");
class MemoryStore {
    constructor(model, config) {
        this.memories = [];
        this.model = model;
        this.config = config;
        this.vectorDb = new hnswlib_node_1.HierarchicalNSW('cosine', config.vectorDimensions);
        this.vectorDb.initIndex(config.maxMemories);
    }
    async addMemory(memory) {
        if (this.memories.length >= this.config.maxMemories) {
            this.memories.shift();
            this.vectorDb = new hnswlib_node_1.HierarchicalNSW('cosine', this.config.vectorDimensions);
            this.vectorDb.initIndex(this.config.maxMemories);
            for (let i = 0; i < this.memories.length; i++) {
                const embedding = this.memories[i].embedding;
                if (embedding) {
                    this.vectorDb.addPoint(embedding, i);
                }
            }
        }
        if (!memory.embedding) {
            memory.embedding = await this.model.generateEmbedding(memory.text);
        }
        if (!memory.embedding) {
            throw new Error('无法生成记忆的向量表示');
        }
        this.memories.push(memory);
        this.vectorDb.addPoint(memory.embedding, this.memories.length - 1);
    }
    async searchMemories(query) {
        if (this.memories.length === 0) {
            return [];
        }
        const queryEmbedding = await this.model.generateEmbedding(query);
        const numNeighbors = Math.min(this.memories.length, 5);
        const { neighbors } = this.vectorDb.searchKnn(queryEmbedding, numNeighbors);
        return neighbors.map(index => this.memories[index])
            .filter(memory => {
            if (!memory.embedding) {
                return false;
            }
            const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding);
            return similarity >= this.config.similarityThreshold;
        })
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    async getAllMemories() {
        return this.memories
            .slice()
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    cosineSimilarity(a, b) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
exports.MemoryStore = MemoryStore;
