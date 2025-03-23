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
    type: MemoryType;
    createdAt: number;
    embedding?: Vector;
    metadata: Record<string, any>;
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

// 目标状态枚举
export enum GoalStatus {
    ACTIVE = 'active',
    COMPLETED = 'completed',
    FAILED = 'failed',
    PENDING = 'pending'
}

// 从Storage导入，不要直接定义
import { Storage } from '../storage/Storage';
// 为了兼容性保留的类型别名
export type StorageProvider<T extends { id: string } = any> = Storage<T>;

// AI模型接口
export interface AIModel {
    generateEmbedding(text: string): Promise<Vector>;
    generateText(prompt: string): Promise<string>;
    generateDecision(context: Context): Promise<Decision>;
    generateResponse(messages: string[]): Promise<{ response: string; tokens: { prompt: number; completion: number } }>;
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

export enum MemoryType {
    OBSERVATION = 'observation',
    REFLECTION = 'reflection',
    CONVERSATION = 'conversation',
    FACT = 'fact',
    PLAN = 'plan'
}

// 搜索相关类型
export interface SearchOptions {
  limit?: number;             // 搜索结果最大数量
  minSimilarity?: number;     // 最小相似度阈值
  timeRange?: {               // 时间范围
    start: Timestamp;
    end: Timestamp;
  };
  types?: MemoryType[];       // 记忆类型过滤
  metadata?: Record<string, any>; // 元数据过滤
}

export interface SearchResult {
  results: Memory[];          // 搜索结果记忆列表
  totalResults: number;       // 结果总数
  metadata?: Record<string, any>; // 搜索元数据
} 