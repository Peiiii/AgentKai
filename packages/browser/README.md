# @agentkai/browser

AgentKai的浏览器环境实现包，提供了在浏览器环境下运行AgentKai所需的所有平台特定实现。

## 快速开始

### 安装

```bash
pnpm add @agentkai/browser @agentkai/core
```

### 基本使用

推荐使用 `AgentService` 作为高层封装：

```typescript
import { AgentService } from './services/agent';

// 1. 获取服务实例
const agentService = AgentService.getInstance();

// 2. 初始化
await agentService.initialize();

// 3. 发送消息
const response = await agentService.sendMessage("你好，请帮我分析一下这段代码");

// 4. 获取记忆
const memories = await agentService.getMemories();

// 5. 获取目标
const goals = await agentService.getGoals();
```

## 架构说明

本包采用分层架构设计：

1. **服务层** - `AgentService`
   - 提供高层业务封装
   - 处理消息格式化
   - 错误处理和状态管理
   
2. **核心层** - `AISystem`
   - 继承自 `BaseAISystem`
   - 提供浏览器环境特定实现
   - 管理存储和搜索功能

3. **平台层** - `browserPlatform`
   - 文件系统实现
   - 环境变量管理
   - 路径工具等

## 核心组件

### AISystem

浏览器环境下的AI系统实现：

```typescript
import { AISystem } from '@agentkai/browser';

export class AISystem extends BaseAISystem {
    // 配置服务
    createConfigService(): BaseConfigService {
        return new ConfigService();
    }
    
    // 目标存储
    createGoalStorage(): StorageProvider<Goal> {
        return new BrowserStorage('/data/goals', 'goals');
    }
    
    // 记忆存储
    createMemoryStorage(): StorageProvider<Memory> {
        return new BrowserStorage('/data/memory', 'memory');
    }
    
    // 记忆搜索
    createMemorySearchProvider(): ISearchProvider {
        return new BrowserSearchProvider(
            'agentkai-memory-index',
            this.createEmbeddingProvider(),
            this.createMemoryStorage()
        );
    }
}
```

### 平台服务

浏览器环境特定的实现：

```typescript
import browserPlatform from '@agentkai/browser';

// 文件系统操作
await browserPlatform.fs.writeFile('/data/config.json', JSON.stringify(config));
const data = await browserPlatform.fs.readFile('/data/config.json');

// 环境变量管理
browserPlatform.env.set('API_KEY', 'your-key');
const apiKey = browserPlatform.env.get('API_KEY');
```

## 存储实现

### BrowserStorage

基于 IndexedDB 的存储实现：

```typescript
import { BrowserStorage } from '@agentkai/browser';

const storage = new BrowserStorage('/data/memories', 'memories');
await storage.save({ id: '1', content: '记忆内容' });
const item = await storage.get('1');
```

### BrowserSearchProvider

向量搜索实现：

```typescript
import { BrowserSearchProvider } from '@agentkai/browser';

const searchProvider = new BrowserSearchProvider(
    'search-index',
    embeddingProvider,
    storage
);
const results = await searchProvider.search('查询内容', 5);
```

## 注意事项

1. **最佳实践**
   - 使用 `AgentService` 作为主要接口
   - 避免直接操作底层 `AISystem`
   - 实现适当的错误处理

2. **存储限制**
   - IndexedDB 存储空间有限
   - 定期清理不必要的数据
   - 监控存储使用情况

3. **安全考虑**
   - 敏感数据加密存储
   - 实现访问控制
   - 注意数据隐私

## 许可证

MIT 