import { Memory, MemoryConfig, AIModel } from '../types';
export declare class MemoryStore {
    private memories;
    private vectorDb;
    private model;
    private config;
    constructor(model: AIModel, config: MemoryConfig);
    addMemory(memory: Memory): Promise<void>;
    searchMemories(query: string): Promise<Memory[]>;
    getAllMemories(): Promise<Memory[]>;
    private cosineSimilarity;
}
