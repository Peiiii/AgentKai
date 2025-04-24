import { create } from 'zustand';
import { AgentService } from '../services/agent/AgentService';
import { Goal, Memory } from '@agentkai/core';
import { Message } from '../types/chat';

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
}

/**
 * 聊天状态管理Store
 * 使用Zustand管理全局状态
 */
export const useChatStore = create<ChatState>((set, get) => {
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
                await get().loadMessages();
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
                const history = await agentService.getMessageHistory();
                set({ messages: history, isLoading: false });
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
            
            let agentMessageId: string;
            
            try {
                set({ isLoading: true, error: null });
                
                // 创建用户消息
                const userMessage: Message = {
                    id: `user_${Date.now()}`,
                    content,
                    isAgent: false,
                    timestamp: new Date(),
                    status: 'sending'
                };
                
                // 创建AI消息
                const agentMessage: Message = {
                    id: `agent_${Date.now()}`,
                    content: '',
                    isAgent: true,
                    timestamp: new Date(),
                    status: 'sending'
                };
                
                agentMessageId = agentMessage.id;
                
                // 添加用户消息和AI消息到列表
                set(state => ({
                    messages: [...state.messages, userMessage, agentMessage]
                }));
                
                // 更新用户消息状态
                set(state => ({
                    messages: state.messages.map(msg => 
                        msg.id === userMessage.id 
                            ? { ...msg, status: 'sent' } 
                            : msg
                    )
                }));
                
                // 使用流式处理
                const api = await import('../api/agent').then(m => m.AgentAPI.getInstance());
                await api.processMessageStream(content, (chunk: string) => {
                    // 更新AI消息内容
                    set(state => ({
                        messages: state.messages.map(msg => 
                            msg.id === agentMessageId 
                                ? { ...msg, content: msg.content + chunk } 
                                : msg
                        )
                    }));
                });
                
                // 更新AI消息状态
                set(state => ({
                    messages: state.messages.map(msg => 
                        msg.id === agentMessageId 
                            ? { ...msg, status: 'sent' } 
                            : msg
                    ),
                    isLoading: false
                }));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '发送消息失败';
                
                // 更新错误状态和消息状态
                set(state => ({
                    messages: state.messages.map(msg => 
                        msg.id === agentMessageId 
                            ? { ...msg, status: 'error', error: errorMessage } 
                            : msg
                    ),
                    isLoading: false,
                    error: errorMessage
                }));
            }
        },
        
        // 清空消息
        clearMessages: () => set({ messages: [] })
    };
});
