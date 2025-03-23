# 浏览器兼容性方案

## 问题分析

通过对代码库的调研，发现要在浏览器环境中运行Core包的代码，需要解决以下兼容性问题：

### 不兼容浏览器的依赖项

#### 1. Node.js 核心模块

**问题模块：**
- `fs` - 文件系统操作（存储和配置文件读写）
- `path` - 路径处理（文件路径管理）
- `os` - 操作系统信息（获取用户主目录等）
- `process` - 进程信息和环境变量（配置和平台检测）
- `child_process` - 子进程操作（CLI包中使用，仅影响CLI）

**受影响的主要类：**
- `ConfigService` - 严重依赖文件系统和环境变量（`services/config.ts`）
- `FileSystemStorage` - 完全依赖文件系统（`storage/FileSystemStorage.ts`）
- `HnswVectorIndex` - 依赖文件系统保存索引（`memory/embedding/HnswVectorIndex.ts`）

#### 2. 第三方依赖

- `hnswlib-node` - 向量搜索库（Node.js专用）
- `dotenv` - 环境变量加载（Node.js专用）

### 代码库中的主要问题点

1. **文件系统访问**：多处使用`fs`模块进行配置文件、数据和索引的读写
2. **环境变量访问**：大量使用`process.env`获取配置信息
3. **路径处理**：使用`path`模块处理文件路径，包括`path.join`、`path.resolve`等
4. **平台检测**：使用`process.platform`检测运行平台
5. **获取用户主目录**：使用`os.homedir()`获取用户主目录
6. **Node.js专用库**：使用仅支持Node.js的第三方库

## 解决方案

### 阶段一：依赖收缩与隔离

首先集中隔离Node.js专用代码，创建明确的平台抽象层：

1. **创建平台服务抽象层**：
   - 定义文件系统、环境变量、路径等抽象接口
   - 提供基于运行环境的工厂方法

2. **重构关键类**：
   - 将所有Node.js特定API的调用隔离到专门的模块
   - 通过依赖注入使用平台服务，而非直接调用Node.js API

3. **替代第三方库**：
   - 为Node.js专用库提供浏览器兼容的替代方案
   - 使用接口抽象不同平台的实现差异

### 阶段二：浏览器兼容实现

为核心功能提供浏览器环境下的替代实现：

1. **存储方案**：
   - 使用IndexedDB替代文件系统
   - 使用localStorage存储小型配置
   - 实现内存缓存作为备份
   
2. **环境变量**：
   - 使用localStorage或内存存储模拟环境变量
   - 提供配置注入机制

3. **向量搜索**：
   - 使用WebAssembly或纯JavaScript实现的向量搜索
   - 考虑在浏览器中使用远程API调用

### 阶段三：构建配置优化

优化打包和构建流程，支持多环境运行：

1. **条件导出**：
   - 使用package.json的条件导出特性
   - 为不同环境提供不同入口

2. **Webpack配置**：
   - 使用适当的polyfill和shim
   - 配置环境特定的构建选项

## 详细设计

### 平台抽象层接口

```typescript
// packages/core/src/platform/interfaces.ts

export interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive: boolean }): Promise<void>;
  readdir(path: string): Promise<string[]>;
  unlink(path: string): Promise<void>;
  stat(path: string): Promise<{ isDirectory(): boolean }>;
}

export interface EnvProvider {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  getAll(): Record<string, string>;
}

export interface PathUtils {
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  dirname(path: string): string;
  basename(path: string): string;
}

export interface PlatformInfo {
  homeDir(): string;
  platform(): string;
  isNode(): boolean;
  isBrowser(): boolean;
}

export interface PlatformServices {
  fs: FileSystem;
  env: EnvProvider;
  path: PathUtils;
  platformInfo: PlatformInfo;
}
```

### 实施计划

1. **依赖收缩（短期）**：
   - 创建平台抽象层
   - 隔离Node.js API调用
   - 重构关键类引用依赖
   
2. **浏览器实现（中期）**：
   - 实现浏览器存储策略
   - 实现浏览器环境变量模拟
   - 提供向量搜索的浏览器实现
   
3. **构建优化（长期）**：
   - 配置条件导出
   - 优化打包流程
   - 完善文档和示例

## 受影响的核心文件

1. `packages/core/src/services/config.ts`
2. `packages/core/src/storage/FileSystemStorage.ts` 
3. `packages/core/src/memory/embedding/HnswVectorIndex.ts`
4. `packages/core/src/memory/embedding/HnswSearchProvider.ts`

## 下一步行动项

1. 创建平台抽象层模块
2. 实现Node.js版本的平台服务
3. 重构ConfigService使用抽象平台服务
4. 重构FileSystemStorage使用抽象平台服务
5. 设计浏览器版本的存储策略 

## 解决的核心依赖问题

以下是为浏览器环境适配的核心Node.js依赖：

1. ✅ **文件系统操作** - 使用IndexedDB实现的BrowserFileSystem
2. ✅ **路径操作** - 使用纯JavaScript实现的BrowserPathUtils
3. ✅ **环境变量** - 使用localStorage实现的BrowserEnv
4. ✅ **IndexedDB存储** - 实现BrowserStorage提供持久化数据存储
5. ✅ **向量搜索** - 使用hnswlib-wasm替代hnswlib-node，实现浏览器兼容的向量搜索

## 平台特定依赖的处理方法

以下是项目中主要的平台特定依赖及其在浏览器环境中的处理方式：

- `fs` - 使用IndexedDB实现的BrowserFileSystem
- `path` - 使用纯JavaScript实现的BrowserPathUtils
- `os` - 使用浏览器的navigator对象获取基本信息
- `process.env` - 使用localStorage模拟环境变量
- `hnswlib-node` - 使用hnswlib-wasm库替代，提供相同的向量搜索功能 

## 实施进展和当前状态

### 已完成工作

1. **平台抽象层**
   - ✅ 创建了完整的平台抽象接口定义
   - ✅ 实现了平台检测逻辑，可以区分Node.js和浏览器环境
   - ✅ 创建了平台服务工厂，支持通过环境自动选择实现

2. **Node.js平台实现**
   - ✅ 创建了@agentkai/node包
   - ✅ 实现了Node.js环境的文件系统、环境变量、路径和平台信息服务
   - ✅ 将hnswlib-node依赖移动到Node.js特定包中

3. **浏览器平台实现**
   - ✅ 创建了@agentkai/browser包
   - ✅ 实现了基于IndexedDB的BrowserFileSystem
   - ✅ 实现了基于localStorage的BrowserEnvProvider
   - ✅ 实现了纯JavaScript版本的BrowserPathUtils
   - ✅ 实现了BrowserPlatformInfo

4. **核心包重构**
   - ✅ 重构ConfigService使用平台抽象层
   - ✅ 重构FileSystemStorage使用平台抽象层
   - ✅ 重构HnswVectorIndex使用平台抽象层
   - ✅ 重构HnswSearchProvider使用平台抽象层
   - ✅ 重构StorageFactory使用平台抽象层和依赖注入模式

### 进行中工作

1. **向量搜索浏览器兼容**
   - 🔄 实现基于hnswlib-wasm的浏览器向量搜索
   - 🔄 创建向量搜索接口抽象，支持不同后端
   - 🔄 设计索引持久化策略

2. **构建与打包优化**
   - 🔄 配置条件导出，适应不同环境
   - 🔄 优化打包配置，减小产物体积
   - 🔄 处理开发环境中的动态导入问题

### 待处理工作

1. **测试与验证**
   - ⬜ 创建浏览器环境测试用例
   - ⬜ 验证核心功能在浏览器环境中的表现
   - ⬜ 性能测试和优化

2. **文档与示例**
   - ⬜ 更新使用指南，说明浏览器环境配置
   - ⬜ 创建示例应用，展示浏览器环境使用方法
   - ⬜ 记录已知限制和注意事项

## 浏览器特有实现详情

### IndexedDB文件系统

浏览器环境中的文件系统使用IndexedDB实现了虚拟文件系统：

```typescript
// BrowserFileSystem关键实现
class BrowserFileSystem implements FileSystem {
  private readonly dbName = 'agentkai-fs';
  private readonly storeName = 'files';
  
  async readFile(path: string): Promise<string> {
    const db = await this.openDB();
    // 通过IndexedDB获取文件内容
    // ...
  }
  
  async writeFile(path: string, data: string): Promise<void> {
    const db = await this.openDB();
    // 将文件写入IndexedDB
    // ...
  }
  
  async exists(path: string): Promise<boolean> {
    try {
      const db = await this.openDB();
      // 检查文件是否存在
      // ...
    } catch {
      return false;
    }
  }
  
  // 其他方法...
}
```

### 浏览器环境变量

浏览器环境变量使用localStorage实现持久化存储：

```typescript
// BrowserEnvProvider关键实现
class BrowserEnvProvider implements EnvProvider {
  private readonly PREFIX = 'agentkai_env_';
  
  get(key: string, defaultValue?: string): string | undefined {
    const value = localStorage.getItem(this.PREFIX + key);
    return value !== null ? value : defaultValue;
  }
  
  set(key: string, value: string): void {
    localStorage.setItem(this.PREFIX + key, value);
  }
  
  getAll(): Record<string, string> {
    const env: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.PREFIX)) {
        const envKey = key.slice(this.PREFIX.length);
        const value = localStorage.getItem(key);
        if (value !== null) {
          env[envKey] = value;
        }
      }
    }
    return env;
  }
}
```

### 使用策略

在应用中，建议使用以下策略来利用平台抽象层：

1. **异步初始化**

```typescript
import { initPlatform } from '@agentkai/core';

async function initializeApp() {
  // 初始化平台服务
  const platform = await initPlatform();
  
  // 使用平台服务初始化应用
  const configService = new ConfigService({ platform });
  // ...
}
```

2. **动态适配**

```typescript
import { platform } from '@agentkai/core';

// 根据平台差异调整行为
if (platform.platformInfo.isBrowser()) {
  // 浏览器特定逻辑
  showUIDialog();
} else {
  // Node.js特定逻辑
  showConsolePrompt();
}
```

## 已知限制和解决方案

### 已解决的问题

1. ✅ **文件系统访问** - 使用IndexedDB提供虚拟文件系统
2. ✅ **环境变量访问** - 使用localStorage存储环境变量
3. ✅ **路径处理** - 使用纯JavaScript实现的路径工具
4. ✅ **平台检测** - 使用统一的平台信息接口
5. ✅ **用户主目录** - 在浏览器环境使用专用根目录

### 待解决的问题

1. ⬜ **向量搜索性能** - 需要验证hnswlib-wasm在浏览器中的性能表现
2. ⬜ **存储限制** - IndexedDB存储限制，需要添加存储空间管理
3. ⬜ **构建体积** - 需要优化浏览器构建产物体积
4. ⬜ **兼容性测试** - 需要测试不同浏览器的兼容性

## 后续工作建议

1. **完善向量搜索** - 优先实现和测试向量搜索在浏览器中的表现
2. **构建优化** - 改进构建流程，减小浏览器包体积
3. **性能优化** - 分析和优化浏览器中的性能瓶颈
4. **开发指南** - 更新开发者文档，说明如何正确使用平台抽象层 