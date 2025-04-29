import { Vector, Timestamp } from '.';

/**
 * 创建记忆的输入
 */
export type CreateMemoryInput = Partial<
    Omit<Memory, 'id' | 'createdAt' | 'embedding' | 'metadata'>
> &
    Required<Pick<Memory, 'content'>>;

/**
 * 记忆搜索结果
 */
export interface MemorySearchResult extends Memory {
    /**
     * 相似度分数 (0-1)
     */
    similarity: number;
}

export enum MemoryType {
    OBSERVATION = 'observation',
    REFLECTION = 'reflection',
    CONVERSATION = 'conversation',
    FACT = 'fact',
    PLAN = 'plan',
}
// 记忆相关类型

export interface Memory {
    id: string;
    content: string;
    type: MemoryType;
    category?: string;
    createdAt: number;
    importance?: number;
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
