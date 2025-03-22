import { Memory, MemoryConfig, AIModel, StorageProvider } from '../types';
export declare class MemorySystem {
    private memories;
    private config;
    private model;
    private storage;
    private vectorDb;
    private logger;
    constructor(config: MemoryConfig, model: AIModel, storage?: StorageProvider);
    initialize(): Promise<void>;
    addMemory(content: string, metadata: Record<string, any>): Promise<void>;
    private calculateImportance;
    private pruneMemories;
    private saveMemories;
    searchMemories(query: string, limit?: number): Promise<Memory[]>;
    getAllMemories(): Promise<Memory[]>;
    deleteMemory(id: string): Promise<void>;
    clearMemories(): Promise<void>;
}
