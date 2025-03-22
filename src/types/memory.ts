/**
 * 记忆类型
 */
export type MemoryType = 'fact' | 'experience' | 'concept' | 'procedure' | 'other';

/**
 * 记忆接口定义
 */
export interface Memory {
  /**
   * 唯一标识符
   */
  id: string;
  
  /**
   * 记忆内容
   */
  content: string;
  
  /**
   * 创建时间戳
   */
  timestamp: number;
  
  /**
   * 重要性等级 (1-10)
   */
  importance: number;
  
  /**
   * 记忆类型
   */
  type: MemoryType;
  
  /**
   * 向量表示
   */
  vector?: number[];
  
  /**
   * 相似度分数 (搜索结果中使用)
   */
  similarity?: number;
}

/**
 * 创建记忆的输入
 */
export interface CreateMemoryInput {
  /**
   * 记忆内容
   */
  content: string;
  
  /**
   * 重要性等级 (默认为5)
   */
  importance?: number;
  
  /**
   * 记忆类型 (默认为fact)
   */
  type?: MemoryType;
}

/**
 * 记忆搜索结果
 */
export interface MemorySearchResult extends Memory {
  /**
   * 相似度分数 (0-1)
   */
  similarity: number;
} 