export interface ModelConfig {
    apiKey: string;
    modelName: string;
    maxTokens?: number;
    temperature?: number;
    baseUrl?: string;
}
export interface MemoryConfig {
    vectorDimensions: number;
    maxMemories: number;
    similarityThreshold: number;
}
export interface DecisionConfig {
    confidenceThreshold: number;
    maxRetries: number;
}
export interface Config {
    modelConfig: ModelConfig;
    memoryConfig: MemoryConfig;
    decisionConfig: DecisionConfig;
}
export interface Memory {
    id: string;
    text: string;
    timestamp: number;
    embedding?: number[];
    metadata?: Record<string, any>;
}
export interface Decision {
    id: string;
    input: string;
    output: string;
    confidence: number;
    reasoning: string[];
    timestamp: number;
    metadata: Record<string, any>;
}
export interface Goal {
    id: string;
    description: string;
    status: GoalStatus;
    priority: number;
    createdAt: number;
    updatedAt?: number;
    completedAt?: number;
    progress: number;
    dependencies: string[];
    subGoals: string[];
    metadata: Record<string, any>;
}
export declare enum GoalStatus {
    PENDING = "pending",
    ACTIVE = "active",
    COMPLETED = "completed",
    FAILED = "failed",
    SUSPENDED = "suspended"
}
export interface SystemState {
    activeGoals: string[];
    currentContext: Record<string, any>;
    performanceMetrics: {
        memoryUsage: number;
        decisionAccuracy: number;
        goalCompletionRate: number;
    };
}
export type UUID = string;
export interface AIModel {
    generateResponse(messages: Array<{
        role: string;
        content: string;
    }>): Promise<string>;
    generateEmbedding(text: string): Promise<number[]>;
}
export interface StorageProvider {
    saveMemories(memories: Memory[]): Promise<void>;
    loadMemories(): Promise<Memory[]>;
    clear(): Promise<void>;
}
export interface GoalStorageProvider {
    saveGoals(goals: Goal[]): Promise<void>;
    loadGoals(): Promise<Goal[]>;
    clear(): Promise<void>;
}
