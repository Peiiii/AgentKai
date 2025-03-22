# 重构建议

本文档列出了进一步提高代码质量与可维护性的重构建议。

## 1. 分解AISystem

AISystem当前承担了过多职责，建议将其分解为多个专注的组件：

```
AISystem
├── InputProcessor - 处理用户输入
├── ContextBuilder - 构建上下文
├── ResponseHandler - 处理模型响应
└── SystemCoordinator - 协调各组件
```

核心思路是让AISystem只作为协调器，而将具体功能委托给专门的组件。

## 2. 实现依赖注入

目前系统中的依赖是硬编码的，建议改为依赖注入方式：

```typescript
// 当前方式
constructor(config: Config, model: AIModel) {
    this.storage = new FileSystemStorage();
    this.decision = new DecisionEngine(config.decisionConfig);
    this.memory = new MemorySystem(config.memoryConfig, model);
    this.goals = new GoalManager(this.storage);
    // ...
}

// 建议方式
constructor(
    private config: Config,
    private model: AIModel,
    private storage: StorageProvider,
    private memory: MemorySystem,
    private goals: GoalManager,
    private decision: DecisionEngine,
    private tools: ToolManager
) {
    this.logger = new Logger('AISystem');
}
```

这样可以提高测试性，并允许替换不同实现。

## 3. 统一性能监控

建议创建统一的性能监控工具，替代分散的console.time调用：

```typescript
// 新建工具类
export class PerformanceMonitor {
    private timers: Record<string, number> = {};
    private logger: Logger;
    
    constructor(module: string) {
        this.logger = new Logger(`${module}:Performance`);
    }
    
    start(label: string): void {
        this.timers[label] = Date.now();
    }
    
    end(label: string): number {
        const startTime = this.timers[label];
        if (!startTime) {
            this.logger.warn(`计时器 ${label} 未启动`);
            return 0;
        }
        
        const duration = Date.now() - startTime;
        this.logger.info(`${label} 完成`, { durationMs: duration });
        delete this.timers[label];
        return duration;
    }
}
```

## 4. 抽象存储接口

为存储系统提供更好的抽象，便于替换不同实现（文件系统、数据库等）：

```typescript
// 已有的接口，但需要更广泛使用
export interface StorageProvider {
    save(key: string, data: any): Promise<void>;
    load(key: string): Promise<any>;
    delete(key: string): Promise<void>;
    list(): Promise<string[]>;
    clear(): Promise<void>;
}

// 实现
export class FileSystemStorage implements StorageProvider { /*...*/ }
export class InMemoryStorage implements StorageProvider { /*...*/ }
export class DatabaseStorage implements StorageProvider { /*...*/ }
```

## 5. 增强配置处理

增强配置系统，支持更安全的类型转换：

```typescript
// 类型安全的解析函数
function parseNumber(value: string | undefined, defaultValue: number): number {
    if (value === undefined) return defaultValue;
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

// 使用方式
maxTokens: parseNumber(process.env.AI_MAX_TOKENS, 2000),
```

## 6. 模块化工具注册

工具注册应更加模块化，便于按需添加功能：

```typescript
// 工具注册器接口
export interface ToolRegistrar {
    registerTools(toolManager: ToolManager): void;
}

// 实现
export class MemoryToolRegistrar implements ToolRegistrar {
    constructor(private memory: MemorySystem) {}
    
    registerTools(toolManager: ToolManager): void {
        const tools = createMemoryTools(this.memory);
        toolManager.registerTools(tools);
    }
}
```

## 7. 一致的API风格

统一异步方法的命名和返回类型：

```typescript
// 不一致的API
async searchMemories(query: string): Promise<Memory[]>;
async deleteMemory(id: string): Promise<void>;
async getAllMemories(): Promise<Memory[]>;

// 一致的API
async findMemories(query: string): Promise<Memory[]>;
async deleteMemory(id: string): Promise<boolean>;
async listMemories(): Promise<Memory[]>;
```

## 8. 实现命令模式

对于复杂操作，考虑使用命令模式：

```typescript
// 命令接口
export interface Command {
    execute(): Promise<any>;
}

// 示例命令
export class SearchMemoriesCommand implements Command {
    constructor(
        private memory: MemorySystem,
        private query: string
    ) {}
    
    async execute(): Promise<Memory[]> {
        return await this.memory.searchMemories(this.query);
    }
}
```

## 实施策略

以上重构不必一次性完成，可以采用渐进式重构策略：

1. 首先实现统一的性能监控和日志系统
2. 然后抽象存储接口，替换硬编码依赖
3. 接着拆分AISystem核心职责
4. 最后规范化API设计，实现命令模式

每个阶段都保持系统可运行，通过测试验证重构的正确性。 