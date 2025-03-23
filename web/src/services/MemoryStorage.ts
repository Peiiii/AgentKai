import { BrowserStorage } from './BrowserStorage';
import { Memory } from '../components/MemoryCard';

/**
 * 记忆存储服务类
 * 负责记忆的持久化存储和检索
 */
export class MemoryStorage {
  private static instance: MemoryStorage;
  private storage: BrowserStorage<Memory>;
  private initialized = false;

  /**
   * 创建记忆存储实例
   * 使用私有构造函数实现单例模式
   */
  private constructor() {
    this.storage = new BrowserStorage<Memory>('/storage', 'memories');
  }

  /**
   * 获取MemoryStorage实例
   */
  public static getInstance(): MemoryStorage {
    if (!MemoryStorage.instance) {
      MemoryStorage.instance = new MemoryStorage();
    }
    return MemoryStorage.instance;
  }

  /**
   * 初始化记忆存储
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.storage.initialize();
      this.initialized = true;
      console.log('MemoryStorage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MemoryStorage:', error);
      throw error;
    }
  }

  /**
   * 保存记忆
   * @param memory 要保存的记忆
   * @returns 保存的记忆
   */
  public async saveMemory(memory: Memory): Promise<Memory> {
    return this.storage.save(memory);
  }

  /**
   * 保存多条记忆
   * @param memories 记忆数组
   * @returns 保存的记忆数组
   */
  public async saveMemories(memories: Memory[]): Promise<Memory[]> {
    return this.storage.saveMany(memories);
  }

  /**
   * 获取记忆
   * @param id 记忆ID
   * @returns 记忆或null（如果不存在）
   */
  public async getMemory(id: string): Promise<Memory | null> {
    return this.storage.get(id);
  }

  /**
   * 获取所有记忆
   * @returns 记忆数组
   */
  public async getAllMemories(): Promise<Memory[]> {
    const memories = await this.storage.getAll();
    
    // 按创建时间排序，最新的在前面
    return memories.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  }

  /**
   * 按类别获取记忆
   * @param category 类别
   * @returns 指定类别的记忆数组
   */
  public async getMemoriesByCategory(category: string): Promise<Memory[]> {
    const allMemories = await this.getAllMemories();
    return allMemories.filter(memory => memory.category === category);
  }

  /**
   * 按标签获取记忆
   * @param tag 标签
   * @returns 包含指定标签的记忆数组
   */
  public async getMemoriesByTag(tag: string): Promise<Memory[]> {
    const allMemories = await this.getAllMemories();
    return allMemories.filter(memory => memory.tags?.includes(tag));
  }

  /**
   * 按重要性获取记忆
   * @param minImportance 最小重要性值
   * @returns 重要性大于等于指定值的记忆数组
   */
  public async getMemoriesByImportance(minImportance: number): Promise<Memory[]> {
    const allMemories = await this.getAllMemories();
    return allMemories.filter(memory => (memory.importance || 0) >= minImportance);
  }

  /**
   * 更新记忆
   * @param id 记忆ID
   * @param updates 要更新的字段
   * @returns 更新后的记忆或null（如果不存在）
   */
  public async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    const memory = await this.getMemory(id);
    if (!memory) return null;
    
    const updatedMemory = { ...memory, ...updates };
    return this.storage.save(updatedMemory);
  }

  /**
   * 删除记忆
   * @param id 记忆ID
   * @returns 是否成功删除
   */
  public async deleteMemory(id: string): Promise<boolean> {
    return this.storage.delete(id);
  }

  /**
   * 清空所有记忆
   * @returns 是否成功清空
   */
  public async clearMemories(): Promise<boolean> {
    return this.storage.clear();
  }
} 