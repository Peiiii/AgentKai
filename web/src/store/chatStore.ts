import { create } from 'zustand';
import { AgentService } from '../services/agent/AgentService';
import { Message } from '../models/Message';
import { Memory } from '../components/MemoryCard';

interface Goal {
    id: string;
    description: string;
    progress: number;
}

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
                
                // 添加用户消息到列表
                set(state => ({
                    messages: [...state.messages, userMessage]
                }));
                
                // 发送消息到AI系统
                const agentMessage = await agentService.sendMessage(content);
                
                // 更新用户消息状态和添加AI回复
                set(state => {
                    // 先创建更新后的消息数组
                    const updatedMessages = state.messages.map(msg => 
                        msg.id === userMessage.id 
                            ? { ...msg, status: 'sent' as const } 
                            : msg
                    );
                    
                    // 返回更新后的状态
                    return {
                        isLoading: false,
                        messages: [...updatedMessages, agentMessage]
                    };
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '发送消息失败';
                
                // 更新错误状态和用户消息状态
                set(state => {
                    // 查找需要更新的消息
                    const targetId = `user_${Date.now()}`;
                    const messageToUpdate = state.messages.find(msg => msg.id === targetId);
                    
                    if (messageToUpdate) {
                        // 如果找到目标消息，则更新它
                        const updatedMessages = state.messages.map(msg => 
                            msg.id === targetId 
                                ? { ...msg, status: 'error' as const, error: errorMessage } 
                                : msg
                        );
                        
                        return {
                            isLoading: false,
                            error: errorMessage,
                            messages: updatedMessages
                        };
                    } else {
                        // 如果没有找到目标消息，只更新错误状态
                        return {
                            isLoading: false,
                            error: errorMessage
                        };
                    }
                });
            }
        },
        
        // 清空消息
        clearMessages: () => set({ messages: [] })
    };
});
