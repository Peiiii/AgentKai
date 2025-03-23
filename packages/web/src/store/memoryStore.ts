import { create } from 'zustand';
import { Memory } from '../components/MemoryCard';
import { MemoryStorage } from '../services/MemoryStorage';

interface MemoryState {
  memories: Memory[];
  categories: string[];
  tags: string[];
  selectedCategory: string | null;
  selectedTag: string | null;
  minImportance: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadMemories: () => Promise<void>;
  addMemory: (memory: Memory) => Promise<void>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  setImportance: (id: string, importance: number) => Promise<void>;
  filterByCategory: (category: string | null) => void;
  filterByTag: (tag: string | null) => void;
  filterByImportance: (minImportance: number) => void;
  clearFilters: () => void;
  setError: (error: string | null) => void;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  categories: [],
  tags: [],
  selectedCategory: null,
  selectedTag: null,
  minImportance: 0,
  isLoading: false,
  error: null,
  
  // 加载所有记忆
  loadMemories: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const memoryStorage = MemoryStorage.getInstance();
      await memoryStorage.initialize();
      
      // 根据过滤条件获取记忆
      let memories: Memory[] = [];
      const { selectedCategory, selectedTag, minImportance } = get();
      
      if (selectedCategory) {
        memories = await memoryStorage.getMemoriesByCategory(selectedCategory);
      } else if (selectedTag) {
        memories = await memoryStorage.getMemoriesByTag(selectedTag);
      } else if (minImportance > 0) {
        memories = await memoryStorage.getMemoriesByImportance(minImportance);
      } else {
        memories = await memoryStorage.getAllMemories();
      }
      
      // 提取所有类别和标签
      const categories = Array.from(new Set(
        memories
          .map(m => m.category)
          .filter(Boolean) as string[]
      ));
      
      const tags = Array.from(new Set(
        memories
          .flatMap(m => m.tags || [])
          .filter(Boolean)
      ));
      
      set({ 
        memories, 
        categories, 
        tags,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to load memories:', error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : '加载记忆失败' 
      });
    }
  },
  
  // 添加新记忆
  addMemory: async (memory) => {
    try {
      set({ isLoading: true, error: null });
      
      const memoryStorage = MemoryStorage.getInstance();
      await memoryStorage.saveMemory(memory);
      
      // 重新加载所有记忆以更新列表
      await get().loadMemories();
    } catch (error) {
      console.error('Failed to add memory:', error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : '添加记忆失败' 
      });
    }
  },
  
  // 更新记忆
  updateMemory: async (id, updates) => {
    try {
      set({ isLoading: true, error: null });
      
      const memoryStorage = MemoryStorage.getInstance();
      await memoryStorage.updateMemory(id, updates);
      
      // 重新加载所有记忆以更新列表
      await get().loadMemories();
    } catch (error) {
      console.error('Failed to update memory:', error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : '更新记忆失败' 
      });
    }
  },
  
  // 删除记忆
  deleteMemory: async (id) => {
    try {
      set({ isLoading: true, error: null });
      
      const memoryStorage = MemoryStorage.getInstance();
      await memoryStorage.deleteMemory(id);
      
      // 从当前状态中移除记忆
      set(state => ({ 
        memories: state.memories.filter(m => m.id !== id),
        isLoading: false 
      }));
    } catch (error) {
      console.error('Failed to delete memory:', error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : '删除记忆失败' 
      });
    }
  },
  
  // 设置记忆重要性
  setImportance: async (id, importance) => {
    try {
      const memoryStorage = MemoryStorage.getInstance();
      await memoryStorage.updateMemory(id, { importance });
      
      // 更新状态中的记忆
      set(state => ({ 
        memories: state.memories.map(m => 
          m.id === id ? { ...m, importance } : m
        )
      }));
    } catch (error) {
      console.error('Failed to set importance:', error);
      set({ 
        error: error instanceof Error ? error.message : '设置重要性失败' 
      });
    }
  },
  
  // 按类别过滤
  filterByCategory: (category) => {
    set({ selectedCategory: category, selectedTag: null });
    get().loadMemories();
  },
  
  // 按标签过滤
  filterByTag: (tag) => {
    set({ selectedTag: tag, selectedCategory: null });
    get().loadMemories();
  },
  
  // 按重要性过滤
  filterByImportance: (minImportance) => {
    set({ minImportance });
    get().loadMemories();
  },
  
  // 清除所有过滤条件
  clearFilters: () => {
    set({ 
      selectedCategory: null, 
      selectedTag: null, 
      minImportance: 0 
    });
    get().loadMemories();
  },
  
  // 设置错误
  setError: (error) => set({ error })
})); 