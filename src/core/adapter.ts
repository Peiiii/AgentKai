import { AISystem } from './AISystem';
import { CreateMemoryInput, Memory } from '../types/memory';

/**
 * 系统适配器，提供AISystem与新接口的兼容层
 */
export class SystemAdapter {
  private aiSystem: AISystem;

  constructor(aiSystem: AISystem) {
    this.aiSystem = aiSystem;
  }

  /**
   * 添加记忆
   * 适配新的记忆接口到旧的AISystem
   */
  async addMemory(input: CreateMemoryInput): Promise<Memory> {
    const { content, importance = 5, type = 'fact' } = input;
    
    // 转换为旧版记忆格式的元数据
    const metadata: Record<string, any> = {
      type: this.convertMemoryType(type),
      importance: this.normalizeImportance(importance)
    };
    
    // 调用原始addMemory方法
    await this.aiSystem.addMemory(content, metadata);
    
    // 创建符合新格式的记忆对象返回
    return {
      id: `mem_${Date.now()}`,  // 简单生成ID
      content,
      timestamp: Date.now(),
      importance,
      type,
    };
  }
  
  /**
   * 搜索记忆
   * 适配新的搜索接口到旧的AISystem
   */
  async searchMemories(query: string, limit: number = 5): Promise<Memory[]> {
    // 获取旧格式的记忆结果
    const oldMemories = await this.aiSystem.searchMemories(query);
    
    // 限制结果数量
    const limitedMemories = oldMemories.slice(0, limit);
    
    // 转换为新格式
    return limitedMemories.map(mem => ({
      id: mem.id,
      content: mem.content,
      timestamp: mem.createdAt,
      importance: mem.metadata?.importance || 5,
      type: this.reverseConvertMemoryType(mem.type),
      similarity: mem.metadata?.similarity
    }));
  }
  
  /**
   * 将新的记忆类型转换为系统内部类型
   */
  private convertMemoryType(type: string): string {
    const typeMap: Record<string, string> = {
      'fact': 'fact',
      'experience': 'event',
      'concept': 'fact',
      'procedure': 'fact',
      'other': 'fact'
    };
    
    return typeMap[type] || 'fact';
  }
  
  /**
   * 将系统内部类型转换为新的记忆类型
   */
  private reverseConvertMemoryType(type: string): 'fact' | 'experience' | 'concept' | 'procedure' | 'other' {
    const typeMap: Record<string, 'fact' | 'experience' | 'concept' | 'procedure' | 'other'> = {
      'fact': 'fact',
      'event': 'experience',
      'goal': 'concept',
      'decision': 'procedure'
    };
    
    return typeMap[type as keyof typeof typeMap] || 'other';
  }
  
  /**
   * 将1-10范围的重要性归一化为0-1范围
   */
  private normalizeImportance(importance: number): number {
    // 将1-10转换为0-1
    return Math.max(0, Math.min(1, (importance - 1) / 9));
  }
} 