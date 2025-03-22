// 基本使用示例

// 导入必要组件
import { AISystem, OpenAIModel, Logger, LogLevel, ModelConfig, Config } from '../src';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 配置系统
const config: Config = {
  modelConfig: {
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL_NAME || 'qwen-max-latest',
    modelName: process.env.AI_MODEL_NAME || 'qwen-max-latest',
    maxTokens: 2000,
    temperature: 0.7,
    apiBaseUrl: process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
    embeddingModel: 'text-embedding-v1',
    embeddingBaseUrl: process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
  },
  memoryConfig: {
    vectorDimensions: 1024,
    maxMemories: 1000,
    similarityThreshold: 0.6,
    shortTermCapacity: 10,
    importanceThreshold: 0.5,
  },
  decisionConfig: {
    confidenceThreshold: 0.7,
    maxRetries: 3,
    maxReasoningSteps: 5,
    minConfidenceThreshold: 0.6,
  }
};

// 设置日志级别
Logger.setGlobalLogLevel(LogLevel.INFO);
const logger = new Logger('Example');

async function main(): Promise<void> {
  try {
    logger.info('初始化系统...');
    
    // 创建模型和AI系统
    const model = new OpenAIModel(config.modelConfig);
    const ai = new AISystem(config, model);
    
    // 初始化系统
    await ai.initialize();
    logger.info('系统初始化完成');
    
    // 添加一条记忆
    await ai.memory.addMemory({
      content: '用户喜欢下棋和阅读科幻小说。',
      source: 'user-profile',
      importance: 0.8
    });
    
    // 添加一个目标
    await ai.goals.addGoal({
      description: '了解用户的兴趣爱好',
      priority: 0.9,
      deadline: Date.now() + 7 * 24 * 60 * 60 * 1000 // 一周后
    });
    
    // 模拟用户对话
    logger.info('开始对话...');
    
    // 首次对话
    const response1 = await ai.processInput('你好，我是小王');
    logger.info(`AI: ${response1.output}`);
    
    // 第二次对话
    const response2 = await ai.processInput('你能推荐一本科幻小说吗？');
    logger.info(`AI: ${response2.output}`);
    
    // 查询记忆
    const memories = await ai.memory.searchMemories('用户 兴趣');
    logger.info('相关记忆:', memories);
    
    // 查询目标
    const goals = await ai.goals.getAllGoals();
    logger.info('当前目标:', goals);
    
  } catch (error) {
    logger.error('运行示例时出错:', error);
  }
}

// 运行示例
main(); 