import { create } from 'zustand';
import { AgentService, Message } from '../services/AgentService';
import { Memory } from '../components/MemoryCard';

interface ChatState {
    messages: Message[];
    memories: Memory[];
    goals: { id: string; description: string; progress: number }[];
    isLoading: boolean;
    error: string | null;

    // Actions
    addMessage: (message: Message) => void;
    sendMessage: (content: string) => Promise<void>;
    loadMessageHistory: () => Promise<void>;
    loadMemories: () => Promise<void>;
    addMemory: (content: string, category?: string, tags?: string[], importance?: number) => Promise<void>;
    setGoals: (goals: { id: string; description: string; progress: number }[]) => void;
    setError: (error: string | null) => void;
    clearMessages: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
    messages: [],
    memories: [],
    goals: [],
    isLoading: false,
    error: null,

    // 添加消息到状态
    addMessage: (message) =>
        set((state) => ({
            messages: [message, ...state.messages],
        })),

    // 发送消息并获取回复
    sendMessage: async (content) => {
        try {
            set({ isLoading: true, error: null });

            const agentService = AgentService.getInstance();
            await agentService.sendMessage(content);

            // 加载最新的消息历史
            await get().loadMessageHistory();
            
            set({ isLoading: false });
        } catch (error) {
            console.error('Failed to send message:', error);
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : '发送消息失败',
            });
        }
    },

    // 加载消息历史
    loadMessageHistory: async () => {
        try {
            set({ isLoading: true, error: null });

            const agentService = AgentService.getInstance();
            const messages = await agentService.getMessageHistory();

            set({ messages, isLoading: false });
        } catch (error) {
            console.error('Failed to load message history:', error);
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : '加载消息历史失败',
            });
        }
    },
    
    // 加载记忆
    loadMemories: async () => {
        try {
            set({ isLoading: true, error: null });

            const agentService = AgentService.getInstance();
            const memories = await agentService.getMemories();

            set({ memories, isLoading: false });
        } catch (error) {
            console.error('Failed to load memories:', error);
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : '加载记忆失败',
            });
        }
    },
    
    // 添加记忆
    addMemory: async (content, category, tags, importance) => {
        try {
            set({ isLoading: true, error: null });

            const agentService = AgentService.getInstance();
            await agentService.addMemory(content, category, tags, importance);
            
            // 重新加载记忆
            await get().loadMemories();
            
            set({ isLoading: false });
        } catch (error) {
            console.error('Failed to add memory:', error);
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : '添加记忆失败',
            });
        }
    },

    // 设置目标
    setGoals: (goals) => set({ goals }),

    // 设置错误
    setError: (error) => set({ error }),

    // 清空消息
    clearMessages: async () => {
        try {
            set({ isLoading: true, error: null });

            const messageStorage = (
                await import('../services/MessageStorage')
            ).MessageStorage.getInstance();
            await messageStorage.clearMessages();

            set({ messages: [], isLoading: false });
        } catch (error) {
            console.error('Failed to clear messages:', error);
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : '清空消息失败',
            });
        }
    },
}));
