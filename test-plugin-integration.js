// 测试插件系统集成
const { AISystem } = require('./dist/core/AISystem');
const { OpenAIModel } = require('./dist/models/OpenAIModel');
const { ConfigService } = require('./dist/services/config');
const { ToolService } = require('./dist/services/tools');

async function testPluginIntegration() {
  try {
    console.log('开始测试插件集成...');
    
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
    
    // 6. 获取工具服务中的工具
    const toolService = ToolService.getInstance();
    const tools = toolService.getAllTools();
    console.log(`工具服务中的工具数量: ${tools.length}`);
    console.log('工具列表:');
    tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
    
    console.log('插件集成测试完成');
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testPluginIntegration(); 