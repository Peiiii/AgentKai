import { ToolCall } from './index';

/**
 * 消息角色类型
 */
export type MessageRole = 'user' | 'assistant' | 'tool' | 'system';

/**
 * 基础消息接口
 */
export interface BaseMessage {
    role: MessageRole;
    content: string | null;
}

/**
 * 用户消息
 */
export interface UserMessage extends BaseMessage {
    role: 'user';
    content: string;
}

/**
 * 系统消息
 */
export interface SystemMessage extends BaseMessage {
    role: 'system';
    content: string;
}

/**
 * 助手消息
 */
export interface AssistantMessage extends BaseMessage {
    role: 'assistant';
    content: string | null;
    tool_calls?: ToolCall[];
}

/**
 * 工具消息
 */
export interface ToolMessage extends BaseMessage {
    role: 'tool';
    tool_call_id: string;
    name: string;
    content: string;
}

/**
 * 消息类型联合
 */
export type Message = UserMessage | AssistantMessage | ToolMessage | SystemMessage;

/**
 * 流式输出块
 */
export interface StreamChunk {
    type: 'text' | 'tool_call' | 'error';
    content: string | ToolCall;
    finish_reason?: string;
}

/**
 * 对话历史
 */
export interface ChatHistory {
    messages: Message[];
    metadata?: Record<string, any>;
} 