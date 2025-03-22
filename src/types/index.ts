// 基础类型定义
export type UUID = string;
export type Timestamp = number;
export type Vector = number[];

// 意识引擎相关类型
export interface ConsciousnessState {
    currentFocus: string;        // 当前关注点
    emotionalState: string;      // 情感状态
    selfAwareness: number;       // 自我认知程度
    decisionConfidence: number;  // 决策信心
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
    decision: Decision;         // 相关决策
    success: boolean;           // 是否成功
    feedback: string;           // 反馈信息
    impact: Record<string, number>;  // 影响评估
}

export interface Context {
    memories: Memory[];         // 相关记忆
    tools: Tool[];              // 可用工具
    environment: Record<string, any>;  // 环境信息
}

// 记忆相关类型
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

// 目标相关类型
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

// 工具相关类型
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
    originalText?: string;  // 工具调用的原始文本表示
}

export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    toolCall: ToolCall;
}

// 系统状态
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

// 配置接口
export interface Config {
    modelConfig: ModelConfig;
    memoryConfig: MemoryConfig;
    decisionConfig: DecisionConfig;
    appConfig: AppConfig;
}

// 应用配置接口
export interface AppConfig {
    name: string;           // AI助手名称
    version: string;        // 应用版本
    defaultLanguage: string; // 默认语言
    dataPath?: string;      // 数据存储路径，如果未指定则使用默认路径
}

// 目标状态枚举
export enum GoalStatus {
    ACTIVE = 'active',
    COMPLETED = 'completed',
    FAILED = 'failed',
    PENDING = 'pending'
}

// 存储提供者接口
export interface StorageProvider {
    save(key: string, data: any): Promise<void>;
    load(key: string): Promise<any>;
    delete(key: string): Promise<void>;
    list(): Promise<string[]>;
    clear(): Promise<void>;
    saveMemories(memories: Memory[]): Promise<void>;
    loadMemories(): Promise<Memory[]>;
}

// 目标存储提供者接口
export interface GoalStorageProvider extends StorageProvider {
    saveGoal(goal: Goal): Promise<void>;
    loadGoal(id: UUID): Promise<Goal>;
    deleteGoal(id: UUID): Promise<void>;
    listGoals(): Promise<Goal[]>;
    saveGoals(goals: Goal[]): Promise<void>;
    loadGoals(): Promise<Goal[]>;
}

// AI模型接口
export interface AIModel {
    generateEmbedding(text: string): Promise<Vector>;
    generateText(prompt: string): Promise<string>;
    generateDecision(context: Context): Promise<Decision>;
    generateResponse(messages: string[]): Promise<{ response: string; tokens: { prompt: number; completion: number } }>;
}

// 模型配置接口
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

// 记忆配置接口
export interface MemoryConfig {
    vectorDimensions: number;
    maxMemories: number;
    similarityThreshold: number;
    shortTermCapacity: number;
    importanceThreshold: number;
}

// 决策配置接口
export interface DecisionConfig {
    confidenceThreshold: number;
    maxRetries: number;
    maxReasoningSteps: number;
    minConfidenceThreshold: number;
}

// 系统响应接口
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

// 删除不存在的导入
// export * from './consciousness'; 