import { ConversationMessage } from '../core';
import { MessageChunk, MessagePart, PartsTrackerEvent } from '../core/response/PartsTracker';
import { Message, StreamChunk } from './message';
import { ToolResult } from './ui-message';

// 基础类型定义
export type UUID = string;
export type Timestamp = number;
export type Vector = number[];

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
    decision: Decision; // 相关决策
    success: boolean; // 是否成功
    feedback: string; // 反馈信息
    impact: Record<string, number>; // 影响评估
}

export interface Context {
    memories: Memory[]; // 相关记忆
    tools: Tool[]; // 可用工具
    environment: Record<string, any>; // 环境信息
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
export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required: boolean;
    default?: any;
}

/**
 * 工具处理函数类型
 */
export type ToolHandler<T = any, R = any> = (args: T) => Promise<R>;

/**
 * 工具定义接口
 */
export interface Tool<T = any, R = any> {
    name: string;
    description: string;
    parameters: JSONSchemaDefinition; // 这里改回any以保持向后兼容
    handler: ToolHandler<T, R>;
}

/**
 * JSON Schema 类型定义
 */
export interface JSONSchemaProperty {
    type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
    description?: string;
    enum?: string[];
    items?: JSONSchemaProperty;
    properties?: Record<string, JSONSchemaProperty>;
    required?: string[];
}

export interface JSONSchemaDefinition {
    type: 'object';
    properties: Record<string, JSONSchemaProperty>;
    required?: string[];
}

/**
 * 工具注册配置
 */
export interface ToolRegistration<T = any, R = any> extends Omit<Tool<T, R>, 'handler'> {
    handler: ToolHandler<T, R>;
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
    PENDING = 'pending',
}

export interface IGenerateStreamWithToolsParams {
    messages: ConversationMessage[];
    tools: Tool[];
    onPartsChange?: (parts: MessagePart[]) => void;
    onPartEvent?: (event: PartsTrackerEvent) => void;
    onAddChunk?: (chunk: MessageChunk) => void;
    // onTextStart?: () => void;
    // onTextChunk?: (chunk: string) => void;
    // onTextEnd?: () => void;
    // onReasoningStart?: () => void;
    // onReasoningChunk?: (chunk: string) => void;
    // onReasoningEnd?: () => void;
    // /** start tool call message */
    // onToolStart?: (tool: Tool) => void;
    // /** end tool call message */
    // onToolEnd?: (tool: Tool) => void;
}

// 扩展AIModel接口
export interface AIModel {
    generateText(prompt: string): Promise<string>;
    generateDecision(context: Context): Promise<Decision>;
    generateResponse(
        messages: Message[]
    ): Promise<{ response: string; tokens: { prompt: number; completion: number } }>;

    // 流式输出方法
    generateStream(messages: Message[]): AsyncGenerator<StreamChunk>;

    // 流式工具调用方法
    generateStreamWithTools(params: IGenerateStreamWithToolsParams): AsyncGenerator<StreamChunk>;
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
    toolResult?: ToolResult<string, Record<string, any>, any>;
}

export enum MemoryType {
    OBSERVATION = 'observation',
    REFLECTION = 'reflection',
    CONVERSATION = 'conversation',
    FACT = 'fact',
    PLAN = 'plan',
}

export * from './tool-call';

export * from './ui-message';
