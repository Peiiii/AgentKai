import { Goal, GoalStorageProvider, Memory, StorageProvider } from '../types';
export declare class FileSystemStorage implements StorageProvider, GoalStorageProvider {
    private basePath;
    private goalsPath;
    private memoriesPath;
    private initialized;
    private logger;
    constructor(basePath?: string);
    private init;
    private ensureInitialized;
    save(key: string, data: any): Promise<void>;
    load(key: string): Promise<any>;
    delete(key: string): Promise<void>;
    list(): Promise<string[]>;
    clear(): Promise<void>;
    saveGoal(goal: Goal): Promise<void>;
    loadGoal(id: string): Promise<Goal>;
    deleteGoal(id: string): Promise<void>;
    listGoals(): Promise<Goal[]>;
    saveGoals(goals: Goal[]): Promise<void>;
    loadGoals(): Promise<Goal[]>;
    saveMemory(memory: Memory): Promise<void>;
    loadMemory(id: string): Promise<Memory>;
    deleteMemory(id: string): Promise<void>;
    listMemories(): Promise<Memory[]>;
    saveMemories(memories: Memory[]): Promise<void>;
    loadMemories(): Promise<Memory[]>;
}
