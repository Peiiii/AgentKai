import { Goal, Memory, MessagePart, PartsTrackerEventType, Tool } from '@agentkai/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AgentService } from '../services/agent/AgentService';
import { Message } from '../types/message';
import { nanoid } from 'nanoid';
import { omit } from 'lodash-es';

interface ChatState {
    messages: Message[];
    memories: Memory[];
    goals: Goal[];
    isLoading: boolean;
    error: string | null;

    // 初始化方法
    initialize: () => Promise<void>;

    // 消息相关方法
    sendMessage: (content: string) => Promise<void>;
    loadMessages: () => Promise<void>;
    loadMessageHistory: () => Promise<void>;
    clearMessages: () => void;

    // 记忆相关方法
    loadMemories: () => Promise<void>;

    // 目标相关方法
    setGoals: (goals: Goal[]) => void;

    // 发送消息（带工具支持）
    sendMessageWithTools: (content: string, tools: Tool[]) => Promise<void>;
}

export const createMessageFromAssistantPart = (part: MessagePart): Message => {
    if (part.type === 'tool_result') {
        return {
            id: nanoid(),
            messageGroupId: part.messageGroupId,
            content: part.toolResult.result,
            role: 'tool',
            tool_call_id: part.toolResult.toolCallId,
            type: 'tool_result',
            timestamp: new Date(),
            status: part.isComplete ? 'sent' : 'sending',
        };
    } else if (part.type === 'tool_call') {
        return {
            id: nanoid(),
            messageGroupId: part.messageGroupId,
            content: "",
            role: 'assistant',
            tool_calls: [part.toolCall],
            type: 'tool_call',
            timestamp: new Date(),
            status: part.isComplete ? 'sent' : 'sending',
        };
    }
    return {
        id: nanoid(),
        messageGroupId: part.messageGroupId,
        content: part.type === 'text' ? part.text : '',
        role: 'assistant',
        type: 'text',
        timestamp: new Date(),
        status: part.isComplete ? 'sent' : 'sending',
    };
};

/**
 * 聊天状态管理Store
 * 使用Zustand管理全局状态
 * 通过persist中间件实现LocalStorage持久化存储
 */
export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => {
            const agentService = AgentService.getInstance();

            return {
                messages: [],
                memories: [],
                goals: [],
                isLoading: false,
                error: null,

                // 初始化AI系统
                initialize: async () => {
                    try {
                        set({ isLoading: true, error: null });
                        await agentService.initialize();
                        // 不再从后端加载消息，而是使用localStorage中的消息
                        set({ isLoading: false });
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : '初始化失败';
                        set({ isLoading: false, error: errorMessage });
                    }
                },

                // 加载历史消息
                loadMessages: async () => {
                    try {
                        set({ isLoading: true, error: null });
                        // 此处仍可选择从后端加载消息，如果需要服务器端持久化
                        // 但由于我们已经使用localStorage，这个操作变得可选
                        set({ isLoading: false });
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : '加载消息失败';
                        set({ isLoading: false, error: errorMessage });
                    }
                },

                // 与loadMessages相同，为了兼容App.tsx
                loadMessageHistory: async () => {
                    await get().loadMessages();
                },

                // 加载记忆
                loadMemories: async () => {
                    try {
                        set({ isLoading: true, error: null });
                        const memories = await agentService.getMemories();
                        set({ memories, isLoading: false });
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : '加载记忆失败';
                        set({ isLoading: false, error: errorMessage });
                    }
                },

                // 设置目标
                setGoals: (goals: Goal[]) => {
                    set({ goals });
                },

                // 发送消息
                sendMessage: async (content: string) => {
                    if (!content.trim()) {
                        return;
                    }

                    let agentMessageId: string | undefined;

                    try {
                        set({ isLoading: true, error: null });

                        // 创建用户消息
                        const userMessage: Message = {
                            id: `user_${Date.now()}`,
                            role: 'user',
                            content,
                            type: 'text',
                            timestamp: new Date(),
                            status: 'sending',
                        };

                        // 创建AI消息
                        const agentMessage: Message = {
                            id: `agent_${Date.now()}`,
                            content: '',
                            role: 'assistant',
                            type: 'text',
                            timestamp: new Date(),
                            status: 'sending',
                        };

                        agentMessageId = agentMessage.id;

                        // 添加用户消息和AI消息到列表
                        set((state) => ({
                            messages: [...state.messages, userMessage, agentMessage],
                        }));

                        // 更新用户消息状态
                        set((state) => ({
                            messages: state.messages.map((msg) =>
                                msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
                            ),
                        }));

                        // 使用流式处理
                        const api = await import('../api/agent').then((m) => m.AgentAPI.getInstance());
                        await api.processMessageStream(content, (chunk: string) => {
                            // 更新AI消息内容
                            set((state) => ({
                                messages: state.messages.map((msg) =>
                                    msg.id === agentMessageId
                                        ? { ...msg, content: msg.content + chunk }
                                        : msg
                                ),
                            }));
                        });

                        // 更新AI消息状态
                        set((state) => ({
                            messages: state.messages.map((msg) =>
                                msg.id === agentMessageId ? { ...msg, status: 'sent' } : msg
                            ),
                            isLoading: false,
                        }));
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : '发送消息失败';

                        // 更新错误状态和消息状态
                        set((state) => ({
                            messages: state.messages.map((msg) =>
                                msg.id === agentMessageId
                                    ? { ...msg, status: 'error', error: errorMessage }
                                    : msg
                            ),
                            isLoading: false,
                            error: errorMessage,
                        }));
                    }
                },

                // 发送消息（带工具支持）
                sendMessageWithTools: async (content: string, tools: Tool[]) => {
                    if (!content.trim()) {
                        return;
                    }

                    try {
                        set({ isLoading: true, error: null });

                        // 创建用户消息
                        const userMessage: Message = {
                            id: `user_${Date.now()}`,
                            content,
                            role: 'user',
                            type: 'text',
                            timestamp: new Date(),
                            status: 'sending',
                        };

                        // 添加用户消息到列表
                        set((state) => ({
                            messages: [...state.messages, userMessage],
                        }));

                        // 更新用户消息状态
                        set((state) => ({
                            messages: state.messages.map((msg) =>
                                msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
                            ),
                        }));

                        console.log('[useChatStore] [sendMessageWithTools] [content]:', content);
                        // 使用流式处理（带工具支持）
                        const api = await import('../api/agent').then((m) => m.AgentAPI.getInstance());
                        await api.processMessageStreamWithTools({
                            content,
                            tools,
                            onPartEvent: (event) => {
                                console.log('[useChatStore] [sendMessageWithTools] [onPartEvent]:', event);
                                switch (event.type) {
                                    case PartsTrackerEventType.PART_ADDED:
                                        set((state) => ({
                                            messages: [
                                                ...state.messages,
                                                createMessageFromAssistantPart(event.part),
                                            ],
                                        }));
                                        break;
                                    case PartsTrackerEventType.PART_UPDATED:
                                        set((state) => {
                                            // 找到与当前部分对应的消息
                                            const lastMessage = state.messages[state.messages.length - 1];
                                            if (
                                                lastMessage &&
                                                lastMessage.messageGroupId === event.part.messageGroupId
                                            ) {
                                                // 使用 omit 避免替换 id
                                                return {
                                                    messages: [
                                                        ...state.messages.slice(0, -1),
                                                        {
                                                            ...lastMessage,
                                                            ...omit(
                                                                createMessageFromAssistantPart(event.part),
                                                                ['id']
                                                            ),
                                                        } as Message,
                                                    ],
                                                };
                                            }
                                            return { messages: state.messages };
                                        });
                                        break;
                                    case PartsTrackerEventType.PART_COMPLETED:
                                        break;
                                }
                            },
                        });

                        // 更新状态
                        set({ isLoading: false });
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : '发送消息失败';

                        // 更新错误状态
                        set({
                            isLoading: false,
                            error: errorMessage,
                        });
                    }
                },

                // 清空消息
                clearMessages: () => set({ messages: [] }),
            };
        },
        {
            name: 'chat-storage', // localStorage中的key名称
            partialize: (state) => ({ 
                messages: state.messages,
                // 选择性存储部分状态，忽略isLoading和error等临时状态
                // 也可以选择存储memories和goals，但这些通常从后端获取
            }),
            // 可选：处理数据版本和迁移
            version: 1,
            // 如果未来状态结构变化，可以添加迁移逻辑
            // migrate: (persistedState: any, version: number) => {
            //   if (version === 0) {
            //     // 版本0到版本1的迁移逻辑
            //     return { ...persistedState, newField: defaultValue } as ChatState;
            //   }
            //   return persistedState as ChatState;
            // },
        }
    )
);
