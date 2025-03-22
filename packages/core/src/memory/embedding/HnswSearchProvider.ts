import { Memory, Vector } from '../../types';
import { Logger } from '../../utils/logger';
import { HnswVectorIndex } from './HnswVectorIndex';
import * as path from 'path';
import { StorageProvider } from '../../types';
import { EmbeddingProvider } from './EmbeddingProvider';

/**
 * HNSW搜索提供者
 * 使用HNSW算法提供高效的向量搜索功能
 */
export class HnswSearchProvider {
  private vectorIndex: HnswVectorIndex;
  private embeddingProvider: EmbeddingProvider;
  private logger: Logger;
  private storage: StorageProvider;
  private dataPath: string;
  private initialized: boolean = false;
  private indexPath: string;
  private dimensions: number;

  /**
   * 创建HNSW搜索提供者
   * @param storage 存储提供者
   * @param embeddingProvider 嵌入提供者
   * @param dataPath 数据路径
   */
  constructor(
    storage: StorageProvider,
    embeddingProvider: EmbeddingProvider,
    dataPath: string = 'data'
  ) {
    this.logger = new Logger('HnswSearchProvider');
    this.storage = storage;
    this.embeddingProvider = embeddingProvider;
    this.dataPath = dataPath;
    this.dimensions = embeddingProvider.getDimensions();
    this.indexPath = path.join(dataPath, 'vector_index.hnsw');
    
    // 创建向量索引
    this.vectorIndex = new HnswVectorIndex(
      this.dimensions,
      100000, // 最大10万条记忆
      this.indexPath
    );
    
    this.logger.info(`创建HNSW搜索提供者，向量维度: ${this.dimensions}`);
  }

  /**
   * 初始化搜索提供者
   * 加载所有记忆到索引中
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      this.logger.info('初始化HNSW搜索提供者');
      const memories = await this.storage.list() as Memory[];
      
      // 计算需要生成嵌入的记忆数量
      const memoriesToEmbed = memories.filter(m => !m.embedding || m.embedding.length === 0);
      
      if (memoriesToEmbed.length > 0) {
        this.logger.info(`需要为 ${memoriesToEmbed.length} 条记忆生成嵌入向量`);
      }
      
      // 逐个处理记忆
      let count = 0;
      for (const memory of memories) {
        // 如果没有嵌入向量，生成一个
        if (!memory.embedding || memory.embedding.length === 0) {
          try {
            memory.embedding = await this.embeddingProvider.getEmbedding(memory.content);
            await this.storage.save(memory.id, memory);
            count++;
            
            if (count % 10 === 0) {
              this.logger.info(`已生成 ${count}/${memoriesToEmbed.length} 条记忆的嵌入向量`);
            }
          } catch (error) {
            this.logger.error(`为记忆 ${memory.id} 生成嵌入向量失败:`, error);
          }
        }
        
        // 添加到索引
        if (memory.embedding && memory.embedding.length > 0) {
          this.vectorIndex.addMemory(memory);
        }
      }
      
      this.logger.info(`HNSW搜索提供者初始化完成，总共索引 ${this.vectorIndex.getSize()} 条记忆`);
      this.initialized = true;
    } catch (error) {
      this.logger.error('初始化HNSW搜索提供者失败:', error);
      throw error;
    }
  }

  /**
   * 添加记忆到搜索索引
   * @param memory 记忆对象
   */
  async addMemory(memory: Memory): Promise<void> {
    // 确保记忆有嵌入向量
    if (!memory.embedding || memory.embedding.length === 0) {
      try {
        memory.embedding = await this.embeddingProvider.getEmbedding(memory.content);
      } catch (error) {
        this.logger.error(`为记忆 ${memory.id} 生成嵌入向量失败:`, error);
        return;
      }
    }
    
    // 添加到索引
    this.vectorIndex.addMemory(memory);
    
    // 定期保存索引
    if (this.vectorIndex.getSize() % 50 === 0) {
      this.saveIndex();
    }
  }

  /**
   * 更新记忆
   * @param memory 记忆对象
   */
  async updateMemory(memory: Memory): Promise<void> {
    await this.addMemory(memory);
  }

  /**
   * 从索引中移除记忆
   * @param id 记忆ID
   */
  removeMemory(id: string): void {
    this.vectorIndex.removeMemory(id);
  }

  /**
   * 基于内容搜索记忆
   * @param query 查询文本
   * @param limit 返回结果数量
   * @returns 相似记忆数组
   */
  async searchByContent(query: string, limit: number = 10): Promise<Memory[]> {
    try {
      // 为查询文本生成嵌入向量
      const queryEmbedding = await this.embeddingProvider.getEmbedding(query);
      return this.searchByVector(queryEmbedding, limit);
    } catch (error) {
      this.logger.error('基于内容搜索记忆失败:', error);
      return [];
    }
  }

  /**
   * 基于向量搜索记忆
   * @param vector 查询向量
   * @param limit 返回结果数量
   * @returns 相似记忆数组
   */
  searchByVector(vector: Vector, limit: number = 10): Memory[] {
    return this.vectorIndex.search(vector, limit);
  }

  /**
   * 保存索引到文件
   */
  saveIndex(): boolean {
    return this.vectorIndex.saveIndex();
  }

  /**
   * 清空索引
   */
  clear(): void {
    this.vectorIndex.clear();
  }
} 