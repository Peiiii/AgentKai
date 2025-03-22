import { HierarchicalNSW, SpaceName } from 'hnswlib-node';
import { Logger } from '../../utils/logger';
import { Memory, Vector } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

interface IndexedMemory {
  id: string;
  vector: Vector;
  memory: Memory;
}

/**
 * 基于HNSW算法的向量索引实现
 * 使用hnswlib-node库提供高效的相似向量搜索
 */
export class HnswVectorIndex {
  private index: HierarchicalNSW | null = null;
  private dimensions: number;
  private maxElements: number;
  private memories: Map<number, IndexedMemory> = new Map();
  private idToIndex: Map<string, number> = new Map();
  private indexToId: Map<number, string> = new Map();
  private currentCount: number = 0;
  private spacetype: SpaceName;
  private logger: Logger;
  private indexPath: string;
  private efConstruction: number;
  private M: number;

  /**
   * 创建HNSW向量索引
   * @param dimensions 向量维度
   * @param maxElements 最大元素数量
   * @param indexPath 索引保存路径
   * @param efConstruction 构建索引时的ef参数(默认200)
   * @param M 最大出边数(默认16)
   * @param spacetype 空间类型('l2'或'ip'，默认'cosine')
   */
  constructor(
    dimensions: number,
    maxElements: number = 10000,
    indexPath: string = '',
    efConstruction: number = 200, 
    M: number = 16,
    spacetype: SpaceName = 'cosine'
  ) {
    this.dimensions = dimensions;
    this.maxElements = maxElements;
    this.spacetype = spacetype;
    this.indexPath = indexPath;
    this.efConstruction = efConstruction;
    this.M = M;
    this.logger = new Logger('HnswVectorIndex');

    this.initIndex();
  }

  /**
   * 初始化索引
   */
  private initIndex(): void {
    try {
      this.index = new HierarchicalNSW(this.spacetype, this.dimensions);
      this.index.initIndex(this.maxElements, this.M, this.efConstruction);
      
      // 设置搜索时的ef参数（影响查询精度和速度）
      this.index.setEf(Math.max(this.efConstruction, 50));
      
      this.logger.info(`创建新的HNSW索引，维度: ${this.dimensions}, 空间类型: ${this.spacetype}`);
      
      // 如果有指定索引路径且文件存在，则尝试加载
      if (this.indexPath && fs.existsSync(this.indexPath)) {
        this.loadIndex();
      }
    } catch (error) {
      this.logger.error('初始化索引失败:', error);
      this.index = null;
    }
  }

  /**
   * 添加记忆到索引
   * @param memory 记忆对象
   * @returns 是否成功添加
   */
  addMemory(memory: Memory): boolean {
    if (!memory.embedding || !this.index) {
      return false;
    }

    try {
      // 如果记忆已存在，先删除旧的
      if (this.idToIndex.has(memory.id)) {
        this.removeMemory(memory.id);
      }

      // 添加到索引
      const indexId = this.currentCount;
      this.index.addPoint(memory.embedding, indexId);
      
      // 更新映射关系
      this.idToIndex.set(memory.id, indexId);
      this.indexToId.set(indexId, memory.id);
      this.memories.set(indexId, {
        id: memory.id,
        vector: memory.embedding,
        memory
      });
      
      this.currentCount++;
      
      this.logger.debug(`记忆已添加到索引, ID: ${memory.id}, 索引ID: ${indexId}`);
      return true;
    } catch (error) {
      this.logger.error(`添加记忆到索引失败, ID: ${memory.id}:`, error);
      return false;
    }
  }

  /**
   * 从索引中移除记忆
   * @param id 记忆ID
   * @returns 是否成功移除
   */
  removeMemory(id: string): boolean {
    if (!this.index || !this.idToIndex.has(id)) {
      return false;
    }

    try {
      const indexId = this.idToIndex.get(id)!;
      
      // 在HNSW中，无法真正删除点，但可以标记为已删除
      // 由于API限制，我们这里只是从映射中移除
      this.idToIndex.delete(id);
      this.indexToId.delete(indexId);
      this.memories.delete(indexId);
      
      this.logger.debug(`记忆已从索引中移除, ID: ${id}, 索引ID: ${indexId}`);
      return true;
    } catch (error) {
      this.logger.error(`从索引中移除记忆失败, ID: ${id}:`, error);
      return false;
    }
  }

  /**
   * 基于向量相似度搜索记忆
   * @param vector 查询向量
   * @param limit 返回结果数量
   * @returns 相似记忆数组，按相似度降序排列
   */
  search(vector: Vector, limit: number = 10): Memory[] {
    if (!this.index || this.currentCount === 0) {
      this.logger.warn('索引为空或未初始化，无法搜索');
      return [];
    }

    try {
      // 向量长度不匹配时处理
      if (vector.length !== this.dimensions) {
        this.logger.warn(`查询向量维度 ${vector.length} 与索引维度 ${this.dimensions} 不匹配`);
        return [];
      }

      // 限制搜索结果数量不超过当前索引中的元素数量
      const numNeighbors = Math.min(limit, this.currentCount);
      if (numNeighbors === 0) return [];

      // 执行搜索
      const result = this.index.searchKnn(vector, numNeighbors);
      
      // 组织返回结果
      const memories: Memory[] = [];
      
      for (let i = 0; i < result.distances.length; i++) {
        const indexId = result.neighbors[i];
        const similarity = this.convertDistanceToSimilarity(result.distances[i]);
        
        if (this.memories.has(indexId)) {
          const memoryData = this.memories.get(indexId)!;
          // 克隆记忆对象并添加相似度信息
          const memoryWithScore: Memory = {
            ...memoryData.memory,
            metadata: {
              ...memoryData.memory.metadata,
              similarity
            }
          };
          memories.push(memoryWithScore);
        }
      }
      
      this.logger.debug(`查询完成，返回 ${memories.length} 条结果`);
      return memories;
    } catch (error) {
      this.logger.error('向量搜索失败:', error);
      return [];
    }
  }

  /**
   * 将距离转换为相似度
   * 根据不同的空间类型，使用不同的转换方法
   */
  private convertDistanceToSimilarity(distance: number): number {
    // 余弦空间的距离是相似度的反比
    if (this.spacetype === 'cosine') {
      return 1 - distance; // 余弦距离转相似度
    } 
    // 内积空间的距离就是相似度
    else if (this.spacetype === 'ip') {
      return distance; // 内积就是相似度
    } 
    // L2空间（欧氏距离）需要转换成相似度
    else if (this.spacetype === 'l2') {
      // 欧氏距离转相似度：使用高斯核
      return Math.exp(-distance / 2);
    }
    // 默认情况
    return 1 - Math.min(1, distance);
  }

  /**
   * 获取所有索引中的记忆
   * @returns 所有记忆的数组
   */
  getAllMemories(): Memory[] {
    return Array.from(this.memories.values()).map(item => item.memory);
  }

  /**
   * 获取索引中的记忆数量
   * @returns 记忆数量
   */
  getSize(): number {
    return this.memories.size;
  }

  /**
   * 保存索引到文件
   * @param filePath 可选的文件路径，不提供则使用构造函数的路径
   * @returns 是否成功保存
   */
  saveIndex(filePath?: string): boolean {
    const indexPath = filePath || this.indexPath;
    
    if (!indexPath || !this.index) {
      this.logger.warn('未指定索引保存路径或索引未初始化');
      return false;
    }

    try {
      // 确保目录存在
      const dir = path.dirname(indexPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 保存索引
      this.index.writeIndex(indexPath);
      
      // 保存元数据
      const metadataPath = `${indexPath}.meta.json`;
      const metadata = {
        dimensions: this.dimensions,
        count: this.currentCount,
        spacetype: this.spacetype,
        idToIndex: Array.from(this.idToIndex.entries()),
        memories: Array.from(this.memories.entries())
      };
      
      fs.writeFileSync(metadataPath, JSON.stringify(metadata), 'utf8');
      
      this.logger.info(`索引已保存到: ${indexPath}`);
      return true;
    } catch (error) {
      this.logger.error('保存索引失败:', error);
      return false;
    }
  }

  /**
   * 从文件加载索引
   * @param filePath 可选的文件路径，不提供则使用构造函数的路径
   * @returns 是否成功加载
   */
  loadIndex(filePath?: string): boolean {
    const indexPath = filePath || this.indexPath;
    
    if (!indexPath || !this.index) {
      this.logger.warn('未指定索引加载路径或索引未初始化');
      return false;
    }

    try {
      // 检查索引文件是否存在
      if (!fs.existsSync(indexPath)) {
        this.logger.warn(`索引文件不存在: ${indexPath}`);
        return false;
      }

      // 加载索引
      this.index.readIndex(indexPath);
      
      // 加载元数据
      const metadataPath = `${indexPath}.meta.json`;
      if (fs.existsSync(metadataPath)) {
        const metadataStr = fs.readFileSync(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataStr);
        
        // 恢复映射关系
        this.dimensions = metadata.dimensions;
        this.currentCount = metadata.count;
        this.spacetype = metadata.spacetype;
        
        this.idToIndex = new Map(metadata.idToIndex);
        this.indexToId = new Map();
        this.memories = new Map();
        
        // 重建索引ID到记忆ID的映射
        for (const [id, indexId] of this.idToIndex.entries()) {
          this.indexToId.set(indexId, id);
        }
        
        // 重建记忆缓存
        for (const [indexId, memoryData] of metadata.memories) {
          this.memories.set(parseInt(indexId), memoryData);
        }
      }
      
      this.logger.info(`索引已加载，维度: ${this.dimensions}, 记忆数量: ${this.getSize()}`);
      return true;
    } catch (error) {
      this.logger.error('加载索引失败:', error);
      
      // 加载失败时重新初始化
      this.initIndex();
      return false;
    }
  }

  /**
   * 清空索引
   */
  clear(): void {
    this.memories.clear();
    this.idToIndex.clear();
    this.indexToId.clear();
    this.currentCount = 0;
    
    // 重新初始化索引
    this.initIndex();
    
    this.logger.info('索引已清空');
  }
} 