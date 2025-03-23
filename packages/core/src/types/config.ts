// /**
//  * 核心模型配置
//  */
// export interface CoreModelConfig {
//   /** 模型提供者（如openai、qwen等） */
//   // provider: string;
//   /** 模型名称 */
//   model: string;
//   /** API密钥 */
//   apiKey: string;
//   /** 温度参数，控制生成的随机性 */
//   temperature?: number;
//   /** 最大输出令牌数 */
//   maxTokens?: number;
//   /** API基础URL，可选 */
//   apiBaseUrl?: string;
// }

// /**
//  * 核心记忆配置
//  */
// export interface CoreMemoryConfig {
//   /** 记忆类型 */
//   type: string;
//   /** 最大消息数量 */
//   maxMessages?: number;
//   /** 向量数据库名称 */
//   vectorDbName?: string;
//   /** 嵌入模型名称 */
//   embeddingModel?: string;
// }

// /**
//  * 核心应用配置
//  */
// export interface CoreAppConfig {
//   /** 是否启用调试模式 */
//   debug?: boolean;
//   /** 日志级别 */
//   logLevel?: string;
//   /** 数据目录 */
//   dataDir?: string;
// }

// /**
//  * 完整的Agent Kai配置
//  */
// export interface AgentKaiConfig {
//   /** 模型配置 */
//   model: CoreModelConfig;
//   /** 记忆配置 */
//   memory: CoreMemoryConfig;
//   /** 应用配置 */
//   app: CoreAppConfig;
// }

/**
 * 配置验证错误
 */
export class ConfigValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigValidationError';
    }
}
// 模型配置接口

export interface ModelConfig {
    model: string;
    apiKey: string;
    modelName: string;
    maxTokens: number;
    temperature: number;
    apiBaseUrl: string;
    embeddingModel: string;
    embeddingBaseUrl: string;
    embeddingDimensions: number;
}
// 记忆配置接口

export interface MemoryConfig {
    vectorDimensions: number;
    maxMemories: number;
    similarityThreshold: number;
    shortTermCapacity: number;
    importanceThreshold: number;
}
// 配置接口

export interface AgentKaiConfig {
    modelConfig: ModelConfig;
    memoryConfig: MemoryConfig;
    appConfig: AppConfig;
}
// 应用配置接口

export interface AppConfig {
    name: string; // AI助手名称
    version: string; // 应用版本
    defaultLanguage: string; // 默认语言
    dataPath?: string; // 数据存储路径，如果未指定则使用默认路径
}
