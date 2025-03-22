import { AIModel, Config, Goal, GoalStatus, Memory, SystemResponse } from '../types';
export declare class AISystem {
    private decision;
    private memory;
    private goals;
    private storage;
    private model;
    private tools;
    private lastResponse;
    private conversationHistory;
    private logger;
    private performance;
    private requestTimeoutMs;
    constructor(config: Config, model: AIModel);
    initialize(): Promise<void>;
    processInput(input: string): Promise<SystemResponse>;
    /**
     * 添加超时机制的Promise包装
     */
    private withTimeout;
    /**
     * 构建发送给模型的上下文信息
     */
    private buildContextMessages;
    /**
     * 处理响应中的工具调用
     */
    private processToolsInResponse;
    addMemory(content: string, metadata: Record<string, any>): Promise<void>;
    searchMemories(query: string): Promise<Memory[]>;
    getAllMemories(): Promise<Memory[]>;
    deleteMemory(id: string): Promise<void>;
    clearMemories(): Promise<void>;
    addGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'status' | 'progress' | 'updatedAt' | 'completedAt'>): Promise<Goal>;
    getGoal(id: string): Promise<Goal>;
    getActiveGoals(): Promise<Goal[]>;
    updateGoalStatus(goalId: string, status: GoalStatus): Promise<void>;
    updateGoalProgress(goalId: string, progress: number): Promise<void>;
    clearGoals(): Promise<void>;
    getAllGoals(): Promise<Goal[]>;
    deleteGoal(id: string): Promise<void>;
    clearCurrentConversation(): Promise<void>;
    private buildSystemPrompt;
}
