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

## 快速开始

### 环境要求

- Node.js >= 16
- TypeScript >= 4.5
- npm >= 7

### 安装

```bash
git clone https://github.com/yourusername/agentkai.git
cd agentkai
npm install
```

### 配置

创建.env文件并设置以下环境变量，可参考.env.example：

```env
# 基础配置
AI_API_KEY=your_api_key_here
AI_MODEL_NAME=qwen-max-latest
```

### 运行

命令行模式：
```bash
npm run cli
```

命令行工具使用：
```bash
# 聊天模式
npm run chat

# 记忆管理
npm run memory-list                  # 列出所有记忆
npm run memory-add "这是新记忆内容"    # 添加新记忆
npm run memory-search "搜索关键词"    # 搜索记忆
npm run memory-remove 123           # 删除指定ID的记忆

# 目标管理
npm run goals-list                  # 列出所有目标
npm run goals-add "完成项目文档"      # 添加新目标

# 使用原始CLI(需要使用 -- 分隔符传递参数)
npm run cli -- memory --list
npm run cli -- goals --add "目标内容"
npm run cli -- goals --progress 123 0.5
npm run cli -- goals --status 123 completed

# 设置日志级别
npm run cli -- --log-level debug chat            # 全局设置DEBUG级别
npm run cli -- chat --debug                      # 仅对chat命令使用DEBUG级别
npm run cli -- --log-level warn memory --list    # 使用WARN级别（减少输出）
npm run cli -- --log-level silent goals --list   # 静默模式（仅输出命令结果）
```

### 日志级别

系统支持以下日志级别，从详细到简洁排序：

- `debug`: 显示所有日志，包括详细的调试信息
- `info`: 显示信息、警告和错误（默认）
- `warn`: 仅显示警告和错误
- `error`: 仅显示错误
- `silent`: 不显示任何日志（仅显示命令结果）

可以通过两种方式设置日志级别：
1. 全局选项: `--log-level <level>` (例如: `--log-level debug`)
2. 命令特定选项: `--debug` (将日志级别设置为DEBUG)

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