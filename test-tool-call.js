// 测试工具调用格式
const { AISystem } = require('./dist/core/AISystem');
const { OpenAIModel } = require('./dist/models/OpenAIModel');
const { ConfigService } = require('./dist/services/config');

async function testToolCall() {
  try {
    console.log('开始测试工具调用...');
    
    // 1. 初始化配置服务
    const configService = ConfigService.getInstance();
    await configService.initialize();
    console.log('配置服务初始化完成');
    
    // 2. 获取配置
    const modelConfig = configService.getAIModelConfig();
    const appConfig = configService.getAppConfig();
    const memoryConfig = configService.getMemoryConfig();
    const decisionConfig = configService.getDecisionConfig();
    
    // 3. 创建Model实例
    const model = new OpenAIModel(modelConfig);
    console.log('模型实例创建完成');
    
    // 4. 创建AISystem实例
    const config = {
      modelConfig,
      appConfig,
      memoryConfig,
      decisionConfig
    };
    const system = new AISystem(config, model);
    
    // 5. 初始化系统
    await system.initialize();
    console.log('系统初始化完成');
    
    // 6. 模拟包含工具调用的回复
    const mockResponse = `测试工具调用，我将使用搜索记忆工具:
    
[[search_memories("测试")]]

上面是搜索结果。现在我将添加一条记忆:

[[add_memory(content: "这是通过新格式工具调用添加的记忆", importance: 8)]]

工具调用完成。`;
    
    // 7. 处理工具调用
    console.log('\n模拟处理AI回复中的工具调用...');
    console.log('\n原始回复:\n', mockResponse);
    
    const result = await system.processToolsInResponse(mockResponse);
    console.log('\n处理后的回复:\n', result.modifiedText);
    console.log('\n工具是否被调用:', result.toolCalled);
    
    console.log('\n工具调用测试完成');
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testToolCall(); 