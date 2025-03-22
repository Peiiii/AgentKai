# 记忆系统架构文档

## 1. 架构概述

AgentKai的记忆系统采用分层架构设计，提供了高效的记忆存储、检索和向量搜索功能。整个系统由以下主要组件构成：

```
MemorySystem (核心系统)
├── StorageProvider (存储接口)
├── EmbeddingProvider (向量嵌入)
│   ├── OpenAIEmbeddingProvider
│   └── FakeEmbeddingProvider
└── 向量搜索 
    ├── HnswSearchProvider (高性能搜索)
    └── HnswVectorIndex (底层索引)
```

## 2. 核心组件

### 2.1 MemorySystem

`MemorySystem`是整个记忆系统的核心，负责记忆的创建、存储、检索和搜索。它集成了存储层、向量嵌入和搜索组件，提供统一的接口。

主要功能：
- 创建记忆并生成向量嵌入
- 存储和检索记忆
- 基于内容或向量的相似度搜索
- 记忆的更新和删除

**设计更新**：我们已将HNSW索引功能从MemorySystem中分离出来，改为使用独立的`HnswSearchProvider`组件。这种设计遵循单一职责原则，使系统更加模块化和易于维护。

### 2.2 存储层

`StorageProvider`接口提供了一个通用的存储抽象，不关心具体的存储内容。

```typescript
export interface StorageProvider {
    save(id: string, data: any): Promise<void>;
    get(id: string): Promise<any>;
    delete(id: string): Promise<void>;
    list(): Promise<any[]>;
    query(filter?: Record<string, any>): Promise<any[]>;
    clear(): Promise<void>;
}
```

### 2.3 向量嵌入

向量嵌入子系统负责将文本转换为向量表示，是实现语义搜索的基础。

#### EmbeddingProvider

`EmbeddingProvider`是一个接口，定义了获取文本嵌入向量的通用方法：

```typescript
export interface EmbeddingProvider {
    getEmbedding(text: string): Promise<number[]>;
    getDimensions(): number;
    getName(): string;
}
```

#### 实现类：

- **OpenAIEmbeddingProvider**: 使用OpenAI API生成高质量的文本嵌入
- **FakeEmbeddingProvider**: 生成随机向量，用于测试和开发

#### EmbeddingProviderFactory

工厂类，负责根据配置创建合适的嵌入提供者实例。

### 2.4 向量搜索组件

系统使用独立的向量搜索组件，基于HNSW算法实现高效的相似度搜索。这种设计使搜索逻辑与核心记忆管理分离，提高了代码的可维护性和可测试性。

#### HnswSearchProvider

`HnswSearchProvider`是高级搜索提供者，封装了向量索引的管理和搜索功能：

```typescript
export class HnswSearchProvider {
  private vectorIndex: HnswVectorIndex;
  private embeddingProvider: EmbeddingProvider;
  private logger: Logger;
  private storage: StorageProvider;
  private dataPath: string;
  private initialized: boolean = false;
  private indexPath: string;
  private dimensions: number;
  
  // 方法
  async initialize(): Promise<void> {...}
  async searchByContent(query: string, limit: number = 10): Promise<Memory[]> {...}
  searchByVector(vector: Vector, limit: number = 10): Memory[] {...}
  saveIndex(): boolean {...}
  addMemory(memory: Memory): void {...}
  removeMemory(id: string): void {...}
  clear(): void {...}
}
```

主要职责：
- 管理向量索引的初始化和维护
- 提供基于内容和向量的搜索功能
- 处理记忆的添加和删除
- 管理索引的持久化

#### HnswVectorIndex

`HnswVectorIndex`是底层索引实现，直接封装了`hnswlib-node`库：

```typescript
export class HnswVectorIndex {
  private index: HierarchicalNSW | null = null;
  private dimensions: number;
  private maxElements: number;
  private memories: Map<number, IndexedMemory> = new Map();
  private idToIndex: Map<string, number> = new Map();
  private indexToId: Map<number, string> = new Map();
  private currentCount: number = 0;
  
  // 方法
  initIndex(): void {...}
  loadIndex(): boolean {...}
  saveIndex(): boolean {...}
  addMemory(memory: Memory): boolean {...}
  removeMemory(id: string): void {...}
  search(vector: Vector, limit: number = 10): Memory[] {...}
  clear(): void {...}
}
```

主要职责：
- HNSW索引的底层操作
- 记忆和索引ID的映射管理
- 向量相似度搜索的具体实现
- 索引的保存和加载

## 3. 记忆数据结构

```typescript
export interface Memory {
    id: string;
    content: string;
    type: MemoryType;
    createdAt: number;
    embedding?: Vector;
    metadata: Record<string, any>;
}
```

- **id**: 唯一标识符
- **content**: 记忆的文本内容
- **type**: 记忆类型（观察、反思、事实等）
- **createdAt**: 创建时间戳
- **embedding**: 向量表示（可选）
- **metadata**: 元数据，可存储任何额外信息

## 4. 关键流程

### 4.1 记忆创建流程

1. 接收文本内容和类型
2. 使用嵌入提供者生成向量表示
3. 创建记忆对象并分配唯一ID
4. 保存到存储提供者
5. 添加记忆到搜索提供者（HnswSearchProvider）

### 4.2 记忆搜索流程

#### 基于内容搜索：
1. 接收搜索查询
2. 使用HnswSearchProvider的searchByContent方法执行搜索
   - 内部生成查询向量
   - 调用基于向量的搜索功能
3. 如果向量搜索失败，回退到关键词匹配
4. 返回相似度最高的记忆

#### 回退机制：
系统设计了完善的回退机制，即使在向量搜索失败的情况下，仍能通过关键词匹配提供搜索结果。

## 5. 性能优化

### 5.1 HNSW算法

系统使用Hierarchical Navigable Small World(HNSW)算法实现次线性时间复杂度的向量搜索：

- 搜索复杂度: O(log(n))，远优于传统O(n)的线性搜索
- 适合大规模记忆库，可扩展到百万级向量
- 配置参数：
  - **M**: 每个节点的最大连接数（默认16）
  - **efConstruction**: 索引构建参数（默认200）
  - **ef**: 搜索精度参数（默认50）

### 5.2 索引持久化

系统支持索引持久化，避免每次启动都重新构建索引：

- 索引文件存储在`vector_index.hnsw`
- 映射关系在HnswVectorIndex内部管理
- 系统启动时通过HnswSearchProvider的initialize方法自动加载现有索引

### 5.3 延迟初始化

搜索提供者实现了延迟初始化模式：
- 系统启动时不会立即构建完整索引，而是在首次搜索时按需初始化
- 对于没有嵌入向量的记忆，会在初始化过程中自动生成并保存

### 5.4 批量处理

搜索提供者支持批量处理记忆：
- 初始化时批量加载记忆到索引中
- 优化日志输出，每处理10条记忆才输出一次日志，减少I/O开销

## 6. 重构实施建议

### 6.1 MemorySystem 重构步骤

以下是将内置HNSW索引替换为HnswSearchProvider的具体步骤：

1. **修改MemorySystem类的构造函数**，添加HnswSearchProvider参数：

```typescript
export class MemorySystem {
    private storage: StorageProvider;
    private logger: Logger;
    private embeddingProvider?: EmbeddingProvider;
    private searchProvider?: HnswSearchProvider;
    
    constructor(
        storage: StorageProvider, 
        embeddingProvider?: EmbeddingProvider, 
        searchProvider?: HnswSearchProvider
    ) {
        this.storage = storage;
        this.embeddingProvider = embeddingProvider;
        this.searchProvider = searchProvider;
        this.logger = new Logger('MemorySystem');
    }
    
    // ...
}
```

2. **移除内置HNSW相关代码**，包括以下方法和属性：
   - 所有的HNSW索引相关属性
   - `initHnswIndex()`方法
   - `loadIndex()`方法
   - `saveIndex()`方法
   - `rebuildIndex()`方法
   - `addToIndex()`方法
   - 传统的余弦相似度计算逻辑

3. **修改createMemory方法**，使用searchProvider添加记忆：

```typescript
async createMemory(content: string, type: MemoryType = MemoryType.OBSERVATION, metadata: Record<string, any> = {}): Promise<Memory> {
    this.logger.debug('创建新记忆', { contentLength: content.length, type });
    
    let embedding: Vector | undefined = undefined;
    if (this.embeddingProvider && content.trim().length > 0) {
        try {
            embedding = await this.embeddingProvider.getEmbedding(content);
            this.logger.debug('生成记忆嵌入向量', { dimensions: embedding.length });
        } catch (error) {
            this.logger.warn('生成嵌入向量失败', error);
        }
    }

    const memory: Memory = {
        id: uuidv4(),
        content,
        type,
        createdAt: Date.now(),
        embedding,
        metadata
    };

    // 保存记忆
    await this.storage.save(memory.id, memory);
    this.logger.debug('记忆已保存', { id: memory.id });
    
    // 添加到搜索索引
    if (this.searchProvider && embedding) {
        await this.searchProvider.addMemory(memory);
    }
    
    return memory;
}
```

4. **修改searchMemoriesByContent方法**，使用searchProvider搜索：

```typescript
async searchMemoriesByContent(query: string, limit: number = 10): Promise<Memory[]> {
    this.logger.debug('按内容搜索记忆', { query, limit });
    
    // 如果有搜索提供者，使用它
    if (this.searchProvider) {
        try {
            return await this.searchProvider.searchByContent(query, limit);
        } catch (error) {
            this.logger.warn('搜索提供者搜索失败，回退到关键词搜索', error);
        }
    }
    
    // 否则回退到简单关键词匹配
    this.logger.debug('使用关键词搜索');
    const allMemories = await this.storage.list() as Memory[];
    
    // 简单关键词匹配
    const lowerQuery = query.toLowerCase();
    const matchedMemories = allMemories
        .filter(memory => memory.content.toLowerCase().includes(lowerQuery))
        .sort((a, b) => b.createdAt - a.createdAt) // 最新的优先
        .slice(0, limit);
    
    this.logger.debug(`查找到 ${matchedMemories.length} 条记忆`);
    return matchedMemories;
}
```

5. **修改searchMemoriesByEmbedding方法**：

```typescript
async searchMemoriesByEmbedding(embedding: number[], limit: number = 10): Promise<Memory[]> {
    this.logger.debug('使用嵌入向量搜索记忆');
    
    // 如果有搜索提供者，使用它
    if (this.searchProvider) {
        return this.searchProvider.searchByVector(embedding, limit);
    }
    
    // 否则返回空结果
    this.logger.warn('没有可用的搜索提供者');
    return [];
}
```

6. **修改deleteMemory方法**：

```typescript
async deleteMemory(id: string): Promise<boolean> {
    this.logger.debug(`删除记忆 ${id}`);
    
    try {
        // 从索引中移除
        if (this.searchProvider) {
            this.searchProvider.removeMemory(id);
        }
        
        // 从存储中删除
        await this.storage.delete(id);
        this.logger.debug(`记忆 ${id} 已删除`);
        return true;
    } catch (error) {
        this.logger.warn(`删除记忆 ${id} 失败:`, error);
        return false;
    }
}
```

7. **修改clearAllMemories方法**：

```typescript
async clearAllMemories(): Promise<void> {
    this.logger.info('清空所有记忆');
    
    // 清空索引
    if (this.searchProvider) {
        this.searchProvider.clear();
    }
    
    // 清空存储
    await this.storage.clear();
}
```

8. **修改updateMemory方法**：

```typescript
async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    this.logger.debug(`更新记忆 ${id}`);
    
    try {
        const memory = await this.storage.get(id) as Memory | null;
        if (!memory) {
            this.logger.warn(`记忆 ${id} 不存在，无法更新`);
            return null;
        }
        
        // 应用更新
        const updatedMemory: Memory = {
            ...memory,
            ...updates,
            // 强制保留原始ID和创建时间
            id: memory.id,
            createdAt: memory.createdAt
        };
        
        // 如果内容被更新且有嵌入提供者，重新生成嵌入
        if (updates.content && this.embeddingProvider && updates.content !== memory.content) {
            try {
                updatedMemory.embedding = await this.embeddingProvider.getEmbedding(updates.content);
                this.logger.debug('已更新记忆嵌入向量');
                
                // 更新索引
                if (this.searchProvider && updatedMemory.embedding) {
                    await this.searchProvider.updateMemory(updatedMemory);
                }
            } catch (error) {
                this.logger.warn('更新嵌入向量失败', error);
            }
        }
        
        await this.storage.save(memory.id, updatedMemory);
        this.logger.debug(`记忆 ${id} 已更新`);
        return updatedMemory;
    } catch (error) {
        this.logger.warn(`更新记忆 ${id} 失败:`, error);
        return null;
    }
}
```

### 6.2 AISystem的更新

需要修改`AISystem`类的构造函数，添加对HnswSearchProvider的创建和传递：

```typescript
constructor(config: Config, model: AIModel, plugins: Plugin[] = []) {
    this.logger = new Logger('AISystem');
    this.performance = new PerformanceMonitor('AISystem');
    this.config = config;
    this.model = model;
    
    // 创建存储工厂
    const dataPath = config.appConfig.dataPath || 'data';
    this.storageFactory = new StorageFactory(dataPath);
    this.logger.info(`使用数据存储路径: ${dataPath}`);
    
    // 创建嵌入提供者 - 检查是否应该使用真实嵌入API
    const useRealEmbeddings = config.memoryConfig?.importanceThreshold > 0 || false;
    const embeddingType = useRealEmbeddings ? 'openai' : 'fake';
    const embeddingProvider = EmbeddingProviderFactory.createProvider(embeddingType, config.modelConfig);
    
    // 创建HNSW搜索提供者
    const memoryStorage = this.storageFactory.getMemoryStorage();
    const searchProvider = new HnswSearchProvider(
        memoryStorage,
        embeddingProvider,
        dataPath
    );
    
    // 初始化记忆系统
    this.memory = new MemorySystem(
        memoryStorage,
        embeddingProvider,
        searchProvider // 传入searchProvider
    );
    
    // 初始化目标系统
    this.goals = new GoalManager(
        this.storageFactory.getGoalStorage()
    );

    // 初始化新组件
    this.conversation = new ConversationManager(10); // 保留最近10条消息
    this.pluginManager = new PluginManager(plugins);
    this.responseProcessor = new ResponseProcessor(this.logger);
    this.promptBuilder = new PromptBuilder(config);
}

async initialize(): Promise<void> {
    // 初始化目标系统
    await this.goals.initialize();
    // 初始化插件管理器
    await this.pluginManager.initialize();
    
    // 初始化HNSW搜索提供者
    if (this.memory && this.memory.getSearchProvider()) {
        await this.memory.getSearchProvider()?.initialize();
    }
    
    this.logger.info('AI系统初始化完成');
}
```

### 6.3 MemorySystem接口扩展

为了支持获取searchProvider，在MemorySystem中添加getter方法：

```typescript
getSearchProvider(): HnswSearchProvider | undefined {
    return this.searchProvider;
}
```

## 7. 配置选项

记忆系统可通过以下配置项进行调整：

```typescript
interface MemoryConfig {
    vectorDimensions: number;    // 向量维度
    maxMemories: number;         // 最大记忆数量
    similarityThreshold: number; // 相似度阈值
    shortTermCapacity: number;   // 短期记忆容量
    importanceThreshold: number; // 重要性阈值
}
``` 