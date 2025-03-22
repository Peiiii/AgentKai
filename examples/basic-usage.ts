// 基本使用示例

// 导入必要组件
import { AISystem, OpenAIModel, Logger, LogLevel } from '../src';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 设置日志级别
Logger.setGlobalLogLevel(LogLevel.INFO);
const logger = new Logger('Example');

async function main() {
  try {
    logger.info('初始化AI系统...');

    // 创建OpenAI模型实例
    const model = new OpenAIModel({
      model: process.env.AI_MODEL_NAME || 'gpt-3.5-turbo',
      apiKey: process.env.AI_API_KEY || '',
      modelName: process.env.AI_MODEL_NAME || 'gpt-3.5-turbo',
      maxTokens: 2000,
      temperature: 0.7,
      apiBaseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
      embeddingModel: process.env.AI_EMBEDDING_MODEL || 'text-embedding-ada-002',
      embeddingBaseUrl: process.env.AI_EMBEDDING_BASE_URL || process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    });

    // 创建系统配置
    const config = {
      modelConfig: {
        model: process.env.AI_MODEL_NAME || 'gpt-3.5-turbo',
        apiKey: process.env.AI_API_KEY || '',
        modelName: process.env.AI_MODEL_NAME || 'gpt-3.5-turbo',
        maxTokens: 2000,
        temperature: 0.7,
        apiBaseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
        embeddingModel: process.env.AI_EMBEDDING_MODEL || 'text-embedding-ada-002',
        embeddingBaseUrl: process.env.AI_EMBEDDING_BASE_URL || process.env.AI_BASE_URL || 'https://api.openai.com/v1',
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
      },
    };

    // 初始化AI系统
    const ai = new AISystem(config, model);
    await ai.initialize();

    // 添加记忆
    await ai.addMemory('我的名字是小智', { 
      type: 'identity', 
      importance: 0.8,
      timestamp: Date.now() 
    });
    logger.info('添加了一条记忆');

    // 添加目标
    const goal = await ai.addGoal({
      description: '学习编程',
      priority: 5,
      metrics: { 
        completionRate: 0,
        satisfactionLevel: 0 
      },
      dependencies: [],
      subGoals: [],
      metadata: {}
    });
    logger.info(`添加了目标: ${goal.id}`);

    // 获取所有记忆
    const memories = await ai.getAllMemories();
    logger.info(`系统中共有 ${memories.length} 条记忆`);

    // 获取所有目标
    const goals = await ai.getAllGoals();
    logger.info(`系统中共有 ${goals.length} 个目标`);

    // 处理用户输入
    const response = await ai.processInput('你好，你是谁？');
    logger.info('AI响应:', response.output);

    logger.info('示例运行完成');
  } catch (error) {
    logger.error('发生错误:', error);
  }
}

// 运行示例
main().catch(console.error); 