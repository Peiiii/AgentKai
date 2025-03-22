export type UUID = string;
export type Timestamp = number;
export type Vector = number[];
export interface ConsciousnessState {
    currentFocus: string;
    emotionalState: string;
    selfAwareness: number;
    decisionConfidence: number;
}
export interface Decision {
    id: string;
    action: string;
    confidence: number;
    reasoning: string;
    timestamp: number;
    context: {
        memories: string[];
        tools: string[];
        goals: string[];
        goalId?: string;
    };
}
export interface Experience {
    decision: Decision;
    success: boolean;
    feedback: string;
    impact: Record<string, number>;
}
export interface Context {
    memories: Memory[];
    tools: Tool[];
    environment: Record<string, any>;
}
export interface Memory {
    id: string;
    content: string;
    type: 'event' | 'fact' | 'goal' | 'decision';
    timestamp: number;
    importance: number;
    metadata: Record<string, any>;
    embedding?: Vector;
}
export interface MemoryQuery {
    content?: string;
    type?: Memory['type'];
    timeRange?: {
        start: Timestamp;
        end: Timestamp;
    };
    limit?: number;
}
export interface Goal {
    id: string;
    description: string;
    priority: number;
    status: GoalStatus;
    createdAt: number;
    updatedAt: number;
    progress: number;
    completedAt?: number;
    dependencies: string[];
    subGoals: string[];
    metadata: Record<string, any>;
    metrics: Record<string, number>;
}
export interface Tool {
    id: string;
    name: string;
    description: string;
    parameters: ToolParameter[];
    handler: (params: Record<string, any>) => Promise<any>;
    category: 'memory' | 'goal' | 'system' | 'file' | 'other';
}
export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required: boolean;
    default?: any;
}
export interface ToolCall {
    toolId: string;
    parameters: Record<string, any>;
    timestamp?: number;
    originalText?: string;
}
export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    toolCall: ToolCall;
}
export interface SystemState {
    activeGoals: UUID[];
    currentContext: Record<string, any>;
    lastDecision?: UUID;
    performanceMetrics: {
        memoryUsage: number;
        decisionAccuracy: number;
        goalCompletionRate: number;
    };
}
export interface Config {
    modelConfig: ModelConfig;
    memoryConfig: MemoryConfig;
    decisionConfig: DecisionConfig;
}
export declare enum GoalStatus {
    ACTIVE = "active",
    COMPLETED = "completed",
    FAILED = "failed",
    PENDING = "pending"
}
export interface StorageProvider {
    save(key: string, data: any): Promise<void>;
    load(key: string): Promise<any>;
    delete(key: string): Promise<void>;
    list(): Promise<string[]>;
    clear(): Promise<void>;
    saveMemories(memories: Memory[]): Promise<void>;
    loadMemories(): Promise<Memory[]>;
}
export interface GoalStorageProvider extends StorageProvider {
    saveGoal(goal: Goal): Promise<void>;
    loadGoal(id: UUID): Promise<Goal>;
    deleteGoal(id: UUID): Promise<void>;
    listGoals(): Promise<Goal[]>;
    saveGoals(goals: Goal[]): Promise<void>;
    loadGoals(): Promise<Goal[]>;
}
export interface AIModel {
    generateEmbedding(text: string): Promise<Vector>;
    generateText(prompt: string): Promise<string>;
    generateDecision(context: Context): Promise<Decision>;
    generateResponse(messages: string[]): Promise<{
        response: string;
        tokens: {
            prompt: number;
            completion: number;
        };
    }>;
}
export interface ModelConfig {
    model: string;
    apiKey: string;
    modelName: string;
    maxTokens: number;
    temperature: number;
    apiBaseUrl: string;
    embeddingModel: string;
    embeddingBaseUrl: string;
}
export interface MemoryConfig {
    vectorDimensions: number;
    maxMemories: number;
    similarityThreshold: number;
    shortTermCapacity: number;
    importanceThreshold: number;
}
export interface DecisionConfig {
    confidenceThreshold: number;
    maxRetries: number;
    maxReasoningSteps: number;
    minConfidenceThreshold: number;
}
export interface SystemResponse {
    output?: string;
    confidence?: number;
    reasoning?: string;
    relevantMemories?: Memory[];
    activeGoals?: Goal[];
    decision?: Decision;
    memories?: Memory[];
    goals?: Goal[];
    tokens?: {
        prompt: number;
        completion: number;
    };
    toolResult?: ToolResult;
}
