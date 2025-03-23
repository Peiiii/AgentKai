# AgentKai Web集成指南

## 浏览器平台概述

AgentKai提供了专门为浏览器环境设计的`@agentkai/browser`包，实现了所有平台抽象接口，使核心功能能够无缝在浏览器中运行。

## 核心组件与实现

### 1. 浏览器平台服务 (BrowserPlatformServices)

浏览器平台服务是用于提供各种平台特定功能的集合，包括：

- 文件系统操作
- 环境变量管理
- 路径处理
- 平台信息查询

```typescript
import browserPlatform from '@agentkai/browser';

// 使用平台服务
const fileSystem = browserPlatform.fs;
const envProvider = browserPlatform.env;
const pathUtils = browserPlatform.path;
const platformInfo = browserPlatform.platformInfo;

// 检查平台类型
if (platformInfo.isBrowser()) {
  console.log('当前在浏览器环境中运行');
}
```

### 2. 浏览器文件系统 (IndexedDBFileSystem)

浏览器平台使用IndexedDB实现了虚拟文件系统，支持所有标准文件操作：

- 文件读写
- 目录创建和遍历
- 文件存在检查
- 文件状态查询

```typescript
// 文件系统操作示例
async function fileSystemOperations() {
  const fs = browserPlatform.fs;
  
  // 创建目录
  await fs.mkdir('/data', { recursive: true });
  
  // 写入文件
  await fs.writeFile('/data/config.json', '{"version": "1.0.0"}');
  
  // 读取文件
  const content = await fs.readFile('/data/config.json');
  
  // 检查文件是否存在
  const exists = await fs.exists('/data/config.json');
  
  // 列出目录内容
  const files = await fs.readdir('/data');
}
```

### 3. 浏览器环境变量 (BrowserEnvProvider)

基于localStorage实现的环境变量存储：

```typescript
// 环境变量操作示例
function environmentVariables() {
  const env = browserPlatform.env;
  
  // 设置环境变量
  env.set('API_URL', 'https://api.example.com');
  
  // 获取环境变量
  const apiUrl = env.get('API_URL');
  
  // 获取所有环境变量
  const allVars = env.getAll();
}
```

## 集成指南

### 步骤1: 安装依赖

确保项目中安装了必要的依赖：

```bash
npm install @agentkai/core @agentkai/browser
```

或在工作区项目中引用：

```json
"dependencies": {
  "@agentkai/browser": "workspace:*"
}
```

### 步骤2: 初始化平台服务

在应用启动时初始化浏览器平台服务：

```typescript
import browserPlatform from '@agentkai/browser';
import { ConfigService } from './services/ConfigService';

async function initializeApp() {
  try {
    // 初始化文件系统
    await ensureFileSystemReady();
    
    // 创建配置服务
    const configService = new ConfigService(browserPlatform);
    
    // 加载配置
    await configService.loadConfig();
    
    console.log('应用初始化成功');
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
}

async function ensureFileSystemReady() {
  const fs = browserPlatform.fs;
  
  // 确保基础目录结构存在
  for (const dir of ['/', '/config', '/data', '/storage']) {
    if (!await fs.exists(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
  
  // 创建默认配置（如果不存在）
  if (!await fs.exists('/config/default.json')) {
    await fs.writeFile('/config/default.json', JSON.stringify({
      appName: 'AgentKai Web',
      version: '1.0.0'
    }, null, 2));
  }
}
```

### 步骤3: 实现存储服务

使用IndexedDB文件系统实现数据存储：

```typescript
import { StorageProvider } from '@agentkai/core';
import browserPlatform from '@agentkai/browser';

// 基于浏览器文件系统的存储实现
export class BrowserStorage<T extends { id: string }> extends StorageProvider<T> {
  private fs = browserPlatform.fs;
  private path = browserPlatform.path;
  
  constructor(basePath: string, name: string = 'BrowserStorage') {
    super(basePath, name);
    this.ensureDirectoryExists();
  }
  
  async save(item: T): Promise<T> {
    const filePath = this.getFilePath(item.id);
    await this.ensureDirectoryExists();
    await this.fs.writeFile(filePath, JSON.stringify(item, null, 2));
    return item;
  }
  
  async get(id: string): Promise<T | null> {
    const filePath = this.getFilePath(id);
    if (!await this.fs.exists(filePath)) {
      return null;
    }
    
    try {
      const content = await this.fs.readFile(filePath);
      return JSON.parse(content) as T;
    } catch (error) {
      console.error(`读取数据失败: ${id}`, error);
      return null;
    }
  }
  
  private getFilePath(id: string): string {
    return this.path.join(this.basePath, `${id}.json`);
  }
  
  private async ensureDirectoryExists(): Promise<void> {
    if (!await this.fs.exists(this.basePath)) {
      await this.fs.mkdir(this.basePath, { recursive: true });
    }
  }
}
```

### 步骤4: 初始化AI代理服务

使用浏览器平台实现AI代理服务：

```typescript
import browserPlatform from '@agentkai/browser';
import { ConfigService } from './ConfigService';
import { BrowserStorage } from './BrowserStorage';

export class AgentService {
  private configService: ConfigService;
  private memoryStorage: BrowserStorage<Memory>;
  private goalStorage: BrowserStorage<Goal>;
  
  constructor() {
    this.configService = new ConfigService(browserPlatform);
    this.memoryStorage = new BrowserStorage<Memory>('/storage/memories', 'MemoryStorage');
    this.goalStorage = new BrowserStorage<Goal>('/storage/goals', 'GoalStorage');
  }
  
  async initialize(): Promise<void> {
    // 初始化各种服务
    await this.configService.initialize();
    
    // 设置AI模型环境变量
    browserPlatform.env.set('MODEL_API_URL', 'https://api.openai.com/v1');
    browserPlatform.env.set('MODEL_VERSION', 'gpt-4');
  }
  
  async processUserMessage(content: string): Promise<string> {
    // AI处理逻辑
    // ...
    return '这是AI的回复';
  }
}
```

## 数据持久化

浏览器环境中，数据通过IndexedDB持久化存储：

- 文件内容存储在IndexedDB中
- 每个文件的路径作为键
- 文件内容和元数据作为值

**注意事项**：

1. 浏览器存储有容量限制，通常在几MB至几百MB之间，取决于浏览器
2. 不同浏览器的IndexedDB实现可能有差异
3. 隐私模式下数据可能无法永久保存

## 浏览器特有限制与解决方案

| 限制 | 解决方案 |
|------|---------|
| 存储容量限制 | 实现数据压缩和清理策略 |
| 无法访问本地文件系统 | 提供导入/导出功能，使用拖放API |
| 网络依赖 | 实现离线模式和数据同步 |
| 跨域限制 | 使用CORS和代理服务 |

## 调试技巧

1. **检查IndexedDB数据**:
   - 打开Chrome DevTools > Application > IndexedDB
   - 查看`agentkai-fs`数据库中的`files`对象存储

2. **监控存储使用量**:
   ```typescript
   function checkStorageUsage() {
     if ('storage' in navigator && 'estimate' in navigator.storage) {
       navigator.storage.estimate().then(estimate => {
         console.log(`已使用: ${estimate.usage} bytes`);
         console.log(`总容量: ${estimate.quota} bytes`);
         console.log(`使用率: ${(estimate.usage / estimate.quota * 100).toFixed(2)}%`);
       });
     }
   }
   ```

3. **错误处理模式**:
   ```typescript
   async function safeOperation<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
     try {
       return await operation();
     } catch (error) {
       console.error('操作失败:', error);
       return fallback;
     }
   }
   ```

## 性能优化建议

1. **批量操作**:
   - 合并多个小文件操作为一个事务
   - 使用批量读取和写入

2. **懒加载和分页**:
   - 实现数据分页加载
   - 使用虚拟列表渲染大量数据

3. **缓存策略**:
   - 缓存频繁访问的数据
   - 实现LRU (最近最少使用) 缓存 