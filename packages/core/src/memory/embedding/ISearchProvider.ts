import { Memory } from '../../types';

/**
 * 搜索选项接口
 */
export interface SearchOptions {
  limit?: number;
  threshold?: number;
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  results: Memory[];
  totalCount?: number;
}

/**
 * 搜索提供者接口
 * 定义向量搜索的统一方法
 */
export interface ISearchProvider {
  /**
   * 初始化搜索提供者
   */
  initialize(): Promise<void>;
  
  /**
   * 添加记忆到搜索索引
   * @param memory 要添加的记忆
   */
  addMemory(memory: Memory): Promise<void>;
  
  /**
   * 更新记忆在搜索索引中的内容
   * @param memory 要更新的记忆
   */
  updateMemory(memory: Memory): Promise<void>;
  
  /**
   * 删除记忆从搜索索引
   * @param id 要删除的记忆ID
   */
  deleteMemory(id: string): Promise<void>;
  
  /**
   * 根据内容搜索记忆
   * @param query 搜索内容
   * @param options 搜索选项
   */
  searchByContent(query: string, options?: SearchOptions): Promise<SearchResult>;
  
  /**
   * 根据向量搜索记忆
   * @param vector 搜索向量
   * @param options 搜索选项
   */
  searchByVector(vector: number[], options?: SearchOptions): Promise<SearchResult>;
  
  /**
   * 清空所有索引内容
   */
  clear(): Promise<void>;
} 