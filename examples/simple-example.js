// 简单使用示例 - JavaScript版本

// 导入必要组件
const { AISystem, OpenAIModel, Logger, LogLevel } = require('../dist');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 设置日志级别
Logger.setGlobalLogLevel(LogLevel.INFO);
const logger = new Logger('SimpleExample');

// 配置系统
const config = {
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

async function main() {
  try {
    logger.info('初始化系统...');
    
    // 创建模型和AI系统
    const model = new OpenAIModel(config.modelConfig);
    const ai = new AISystem(config, model);
    
    // 初始化系统
    await ai.initialize();
    logger.info('系统初始化完成');
    
    // 处理用户输入示例
    const response = await ai.processInput('你好，我是谁？');
    logger.info(`AI回复: ${response.output || '无输出'}`);
    
    logger.info('示例运行完成');
  } catch (error) {
    logger.error('运行示例时出错:', error);
  }
}

// 运行示例
main(); 