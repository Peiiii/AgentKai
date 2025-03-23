/**
 * @agentkai/core 包的主入口文件
 * 导出核心功能和接口
 */

// 导出所有核心API
// 1. 类型定义
export * from './types';
export * from "./types/config"

// 2. 核心系统
export * from './core/AISystem';
export * from './core/adapter';
export * from './core/prompts/PromptBuilder';
export * from './core/response/ResponseProcessor';

// 3. 记忆系统
export * from './memory/MemorySystem';
export * from './memory/embedding/EmbeddingProvider';
export * from './memory/embedding/HnswVectorIndex';
export * from './memory/embedding/HnswSearchProvider';

// 4. 目标系统
export * from './goals/GoalManager';

// 5. 存储系统
export * from './storage/FileSystemStorage';
// 显式导出StorageManager避免命名冲突
export { StorageManager } from './storage/StorageManager';

// 6. 服务
export * from './services/config';
// 显式导出ToolService和ToolRegistration避免命名冲突
export { ToolService, ToolRegistration, Tool, ToolHandler, ToolParameter } from './services/tools';

// 7. 工具
export * from './utils/logger';
export * from './utils/errors';
export * from './utils/performance';
export * from './utils/logging'; 

// 8. 模型
export * from './models/OpenAIModel';

// 9. 插件
export * from './plugins/basic-tools';
export * from './plugins/goals-plugin';
export * from './plugins/memory-plugin';

// 10. 平台抽象层
export * from './platform/interfaces';
export { default as platform } from './platform';

// 其他导出内容将根据需要添加