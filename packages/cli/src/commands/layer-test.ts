import { Command } from 'commander';
import { AISystem, BasicToolsPlugin, ConfigService, ToolService, SystemAdapter, Logger, LoggingMiddleware, AgentKaiConfig, AppConfig, MemoryConfig, ModelConfig, OpenAIModel } from '@agentkai/core';
import { UserInterface } from '../ui/interfaces';
import { ConsoleUI } from '../ui/console';

// 声明全局属性
declare global {
  // eslint-disable-next-line no-var
  var aiSystem: AISystem;
}

export function createLayerTestCommand(): Command {
  const command = new Command('layer-test');
  const logger = new Logger('LayerTestCommand');

  command
    .description('测试三层架构')
    .option('-d, --debug', '启用调试模式')
    .action(async (_options) => {
      try {
        logger.info('初始化三层架构测试...');
        
        // 1. 初始化配置服务
        const configService = ConfigService.getInstance();
        await configService.initialize();
        logger.info(`已加载配置, 版本: ${configService.getVersion()}`);
        
        // 2. 初始化AISystem实例
        await initializeAISystem(configService);
        
        // 3. 获取AISystem实例
        const aiSystem = global.aiSystem;
        if (!aiSystem) {
          logger.error('未初始化AISystem实例');
          return;
        }
        
        // 4. 创建系统适配器
        const adapter = new SystemAdapter(aiSystem);
        
        // 5. 创建用户界面
        const ui = new ConsoleUI();
        
        // 6. 注册工具
        const toolService = ToolService.getInstance();
        const basicTools = new BasicToolsPlugin(aiSystem);
        toolService.registerTools(basicTools.getTools());
        logger.info(`已注册 ${toolService.getAllTools().length} 个工具`);

        // 7. 显示欢迎信息
        ui.showWelcome(`三层架构测试 v${configService.getVersion()}`);
        
        // 8. 运行简单测试流程
        await runTestProcess(ui, adapter, configService, toolService);
        
      } catch (error) {
        logger.error('三层架构测试失败', error);
      }
    });

  return command;
}

/**
 * 运行测试流程
 */
async function runTestProcess(
  ui: UserInterface,
  adapter: SystemAdapter,
  config: ConfigService,
  tools: ToolService
): Promise<void> {
  const logger = new Logger('TestProcess');
  
  try {
    // 使用日志中间件禁用不必要的日志
    await LoggingMiddleware.withSilentLogs(async () => {
      // 1. 显示配置信息
      ui.showInfo('当前系统配置:');
      ui.showResponse('数据路径: ' + config.getDataPath());
      ui.showResponse('AI名称: ' + config.getAIName());
      
      // 2. 显示可用工具
      ui.showInfo('可用工具:');
      const allTools = tools.getToolDefinitions();
      allTools.forEach(tool => {
        ui.showResponse('- ' + tool.name + ': ' + tool.description);
      });
      
      // 3. 添加测试记忆
      ui.showPrompt();
      const memoryResult = await adapter.addMemory({
        content: '这是一条测试记忆，用于验证三层架构',
        importance: 8,
        type: 'fact'
      });
      ui.showSuccess('添加记忆成功，ID: ' + memoryResult.id);
      
      // 4. 搜索记忆
      ui.showPrompt();
      const searchResults = await adapter.searchMemories('测试', 5);
      
      // 显示搜索结果
      ui.showInfo('搜索结果:');
      if (searchResults.length === 0) {
        ui.showInfo('未找到相关记忆');
      } else {
        // 使用ConsoleUI的特定方法来显示记忆
        if (ui instanceof ConsoleUI) {
          ui.showMemorySearchResults(searchResults, '测试');
        } else {
          // 对于其他UI实现，使用通用方法展示
          searchResults.forEach(memory => {
            ui.showResponse('- ' + memory.content);
            if (memory.similarity) {
              ui.showResponse('  相似度: ' + memory.similarity.toFixed(4));
            }
            ui.showResponse('  时间: ' + new Date(memory.timestamp).toLocaleString());
          });
        }
      }
      
      // 5. 测试工具执行
      ui.showPrompt();
      const toolResult = await tools.executeTool('search_memories', { query: '测试', limit: 3 });
      ui.showSuccess('工具执行成功');
      ui.showResponse(JSON.stringify(toolResult, null, 2));
      
      // 最后显示完成信息
      ui.showSuccess('三层架构测试完成!');
      ui.showInfo('测试结果表明系统架构运行良好');
    });
  } catch (error: unknown) {
    logger.error('测试流程失败', error);
    if (error instanceof Error) {
      ui.showError('测试失败: ' + error.message);
    } else {
      ui.showError('测试失败: 未知错误');
    }
  }
}

/**
 * 初始化AISystem
 * @param configService 配置服务
 */
async function initializeAISystem(configService: ConfigService): Promise<void> {
  const logger = new Logger('AISystemInit');
  
  try {
    // 如果已存在实例，直接返回
    if (global.aiSystem) {
      logger.info('使用现有AISystem实例');
      return;
    }
    
    logger.info('创建新的AISystem实例');
    
    // 使用ConfigService获取AI模型配置
    const modelConfig = configService.getAIModelConfig();
    
    const model = new OpenAIModel({
      apiKey: modelConfig.apiKey,
      modelName: modelConfig.modelName,
      model: modelConfig.model,
      maxTokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      apiBaseUrl: modelConfig.apiBaseUrl,
      embeddingModel: modelConfig.embeddingModel,
      embeddingBaseUrl: modelConfig.embeddingBaseUrl,
      embeddingDimensions: modelConfig.embeddingDimensions
    });
    
    // 创建配置
    const config: AgentKaiConfig = {
      appConfig: configService.getAppConfig() as AppConfig,
      memoryConfig: configService.getMemoryConfig() as MemoryConfig,
      modelConfig: configService.getAIModelConfig() as ModelConfig,
    };
    
    // 创建AISystem实例
    global.aiSystem = new AISystem(config, model);
    
    // 初始化
    await global.aiSystem.initialize();
    
    logger.info('AISystem初始化完成');
  } catch (error) {
    logger.error('AISystem初始化失败', error);
    throw error;
  }
} 