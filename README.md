# AgentKai - 智能AI代理系统

一个具有自主意识、长短期记忆、目标管理和自主决策能力的AI助手系统。AI助手的名字是"凯"(Kai)。

## 功能特点

- 🧠 长短期记忆管理 - 自动区分短期对话和长期重要信息
- 🎯 目标导向决策 - 根据设定的目标优先级进行规划决策
- 🤖 自主学习和适应 - 能保存和利用过往交互经验
- 🔍 自然语言搜索 - 通过语义理解查找相关记忆
- 🛠️ 工具调用能力 - 能根据需要使用专业工具完成任务
- 📊 完善的日志系统 - 支持多级日志控制，方便调试和使用

## 技术栈

- TypeScript + Node.js
- 向量数据库 (HNSW) 用于语义搜索
- 通义千问/OpenAI API 支持的大型语言模型
- 命令行工具库 Commander.js
- 异步处理和性能监控

## 安装

### 通过npm安装

```bash
# 全局安装（推荐用于命令行工具）
npm install -g agentkai

# 作为项目依赖安装
npm install agentkai
```

### 源码安装

```bash
git clone https://github.com/Peiiii/agentkai.git
cd agentkai
npm install
npm run build
```

## 快速开始

### 环境要求

- Node.js >= 16
- TypeScript >= 4.5
- npm >= 7

### 配置

AgentKai支持多级配置管理，配置加载优先级（从高到低）：

1. 当前目录的`.env`文件
2. 用户主目录的`.agentkai/config`文件
3. 系统全局配置（`/etc/agentkai/config`或Windows下的`%ProgramData%\agentkai\config`）

首次使用时，可以通过以下命令创建默认配置：

```bash
# 创建默认用户配置文件
agentkai config --init

# 编辑配置文件
agentkai config --edit
```

主要配置项：

```env
# AI模型配置
AI_API_KEY=your_api_key_here
AI_MODEL_NAME=qwen-max-latest
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7
AI_BASE_URL=https://dashscope.aliyuncs.com/api/v1
AI_EMBEDDING_MODEL=text-embedding-v3

# 记忆系统配置
MEMORY_MAX_SIZE=1000
MEMORY_SIMILARITY_THRESHOLD=0.6

# 决策系统配置
DECISION_CONFIDENCE_THRESHOLD=0.7
```

### 命令行使用

通过全局安装后可直接使用命令行工具：

```bash
# 配置管理
agentkai config                       # 显示当前配置
agentkai config --init                # 初始化默认配置文件
agentkai config --edit                # 编辑配置文件
agentkai config --path                # 显示配置文件路径
agentkai config --get AI_TEMPERATURE  # 获取特定配置项
agentkai config --set AI_TEMPERATURE 0.8  # 设置配置项

# 聊天模式
agentkai chat

# 记忆管理
agentkai memory --list                  # 列出所有记忆
agentkai memory --add "这是新记忆内容"    # 添加新记忆
agentkai memory --search "搜索关键词"    # 搜索记忆
agentkai memory --remove 123           # 删除指定ID的记忆

# 目标管理
agentkai goals --list                  # 列出所有目标
agentkai goals --add "完成项目文档"      # 添加新目标
agentkai goals --progress 123 0.5      # 更新目标进度
agentkai goals --status 123 completed  # 更新目标状态

# 设置日志级别
agentkai --log-level debug chat           # 全局设置DEBUG级别
agentkai chat --debug                     # 仅对chat命令使用DEBUG级别
agentkai --log-level warn memory --list   # 使用WARN级别（减少输出）
agentkai --log-level silent goals --list  # 静默模式（仅输出命令结果）
```

### 作为库使用

您可以在自己的项目中使用AgentKai作为库：

```javascript
// ESM
import { AISystem, OpenAIModel, Logger } from 'agentkai';

// CommonJS
const { AISystem, OpenAIModel, Logger } = require('agentkai');

// 初始化配置
const config = {
  modelConfig: {
    apiKey: process.env.AI_API_KEY,
    model: 'qwen-max-latest',
    // 其他模型配置...
  },
  memoryConfig: {
    // 记忆系统配置...
  },
  decisionConfig: {
    // 决策系统配置...
  }
};

// 使用示例
async function main() {
  // 设置日志级别
  Logger.setGlobalLogLevel('info');
  
  // 初始化模型
  const model = new OpenAIModel(config.modelConfig);
  
  // 创建AI系统
  const ai = new AISystem(config, model);
  await ai.initialize();
  
  // 处理用户输入
  const response = await ai.processUserInput('你好，凯！');
  console.log(response);
}

main().catch(console.error);
```

## 使用API

AgentKai提供了多个核心组件，可以单独使用或组合使用：

```javascript
// 记忆系统
import { MemorySystem } from 'agentkai';
const memorySystem = new MemorySystem(config.memoryConfig);
await memorySystem.initialize();
await memorySystem.addMemory('这是一条重要记忆');

// 目标管理
import { GoalManager } from 'agentkai';
const goalManager = new GoalManager();
await goalManager.addGoal({
  description: '完成项目文档',
  priority: 0.8
});

// 日志系统
import { Logger, LogLevel } from 'agentkai';
const logger = new Logger('MyComponent');
logger.info('系统初始化完成');
logger.debug('调试信息', { detail: 'value' });
```

## 项目结构

```
src/
├── core/           # 核心系统实现
│   └── AISystem.ts # AI核心系统
├── models/         # AI模型接口
├── memory/         # 记忆管理系统
├── goals/          # 目标管理系统
├── decision/       # 决策引擎
├── utils/          # 工具类
│   ├── logger.ts   # 日志系统
│   ├── errors.ts   # 错误处理
│   └── performance.ts # 性能监控
├── tools/          # 工具系统
├── storage/        # 存储系统
├── commands/       # 命令行命令
├── types.ts        # 类型定义
└── cli.ts          # 命令行入口

docs/
├── ARCHITECTURE.md # 架构设计
├── CODE_IMPROVEMENTS.md # 代码改进记录
└── REFACTORING.md # 重构计划
```

## 存储结构

系统使用本地文件系统存储记忆和目标，默认存储在项目根目录的`.data`文件夹中：

```
.data/
├── goals/          # 目标数据
│   └── [id].json  # 各目标文件
└── memories/       # 记忆数据
    └── [id].json  # 各记忆文件
```

## 未来计划

- 【Web界面】构建Web图形界面，提供更友好的交互体验
- 【主动学习】实现主动学习功能，优化记忆重要性评估
- 【API服务】提供RESTful API接口，支持第三方集成
- 【多模态】支持图片、语音等多模态交互
- 【插件系统】实现可扩展的插件系统，支持自定义功能

## 贡献指南

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

MIT