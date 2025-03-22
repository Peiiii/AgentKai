/**
 * 三层架构使用示例
 * 
 * 本示例展示如何使用分层架构重构AISystem
 * 
 * 架构分层：
 * 1. UI层 - 负责与用户交互
 * 2. 业务逻辑层 - 包含业务规则和处理逻辑
 * 3. 数据访问层 - 负责数据持久化和检索
 * 
 * 优势：
 * - 提高代码可维护性
 * - 更好的模块化和分离关注点
 * - 便于单元测试
 * - 可扩展性更强
 */

import { AISystem } from '../core/AISystem';
import { SystemAdapter } from '../core/adapter';
import { UserInterface } from '../ui/interfaces';
import { ConsoleUI } from '../ui/console';
import { ConfigService } from '../services/config';
import { ToolService } from '../services/tools';
import { BasicToolsPlugin } from '../plugins/basic-tools';
import { Logger } from '../utils/logger';
import { LoggingMiddleware } from '../utils/logging';
import { Memory } from '../types/memory';

/**
 * 执行示例
 */
export async function runExample(): Promise<void> {
  const logger = new Logger('ThreeLayerExample');
  
  try {
    logger.info('初始化配置服务...');
    
    // 1. 配置服务初始化
    const configService = ConfigService.getInstance();
    await configService.initialize();
    
    // 2. 全局AISystem实例
    // 实际应用中，应使用依赖注入容器或工厂
    const aiSystem = global.aiSystem as AISystem;
    
    // 3. 创建系统适配器
    const adapter = new SystemAdapter(aiSystem);
    
    // 4. 创建用户界面
    const ui = new ConsoleUI({ colorEnabled: true });
    
    // 5. 初始化工具服务
    const toolService = ToolService.getInstance();
    
    // 6. 注册基础工具
    const basicTools = new BasicToolsPlugin(aiSystem);
    toolService.registerTools(basicTools.getTools());
    
    // 展示欢迎信息
    ui.showWelcome(`三层架构示例 v${configService.getVersion()}`);
    ui.showInfo('本示例展示了如何使用分层架构设计聊天机器人系统');
    
    // 执行一些操作
    await demonstrateOperations(ui, adapter, configService, toolService);
    
    // 清理资源
    ui.close();
    logger.info('示例程序执行完毕');
  } catch (error) {
    logger.error('示例执行失败', error);
  }
}

/**
 * 展示三层架构操作
 */
async function demonstrateOperations(
  ui: UserInterface,
  adapter: SystemAdapter,
  config: ConfigService,
  tools: ToolService
): Promise<void> {
  const logger = new Logger('Operations');
  
  try {
    // 使用日志中间件禁用多余日志
    await LoggingMiddleware.withSilentLogs(async () => {
      // 展示如何将操作委托给不同层
      ui.showInfo('=== 配置服务示例 ===');
      ui.showResponse(`AI名称: ${config.getAIName()}`);
      ui.showResponse(`数据路径: ${config.getDataPath()}`);
      
      // 添加记忆
      ui.showInfo('\n=== 添加记忆示例 ===');
      ui.showPrompt();
      const memory = await adapter.addMemory({
        content: '这是通过分层架构添加的记忆',
        importance: 8,
        type: 'fact'
      });
      ui.showSuccess(`记忆添加成功，ID: ${memory.id}`);
      
      // 搜索记忆
      ui.showInfo('\n=== 搜索记忆示例 ===');
      ui.showPrompt();
      const results = await adapter.searchMemories('分层架构', 3);
      if (results.length > 0) {
        displayMemories(ui, results);
      } else {
        ui.showInfo('未找到匹配的记忆');
      }
      
      // 工具调用
      ui.showInfo('\n=== 工具服务示例 ===');
      ui.showPrompt();
      const toolDefs = tools.getToolDefinitions();
      ui.showResponse(`系统注册了 ${toolDefs.length} 个工具:`);
      toolDefs.forEach(tool => {
        ui.showResponse(`- ${tool.name}: ${tool.description}`);
      });
      
      // 执行工具
      const toolResult = await tools.executeTool('add_memory', {
        content: '这是通过工具服务添加的记忆',
        importance: 7,
        type: 'experience'
      });
      ui.showSuccess('工具执行成功');
      ui.showResponse(`结果: ${JSON.stringify(toolResult)}`);
      
      // 总结
      ui.showInfo('\n=== 架构优势 ===');
      ui.showResponse('1. 关注点分离 - UI、业务逻辑和数据访问各司其职');
      ui.showResponse('2. 模块化设计 - 每个组件只负责自己的职责');
      ui.showResponse('3. 可测试性 - 更容易对各层进行单元测试');
      ui.showResponse('4. 可扩展性 - 可以轻松添加新功能');
    });
  } catch (error) {
    logger.error('操作演示失败', error);
    if (error instanceof Error) {
      ui.showError(`错误: ${error.message}`);
    } else {
      ui.showError('发生未知错误');
    }
  }
}

/**
 * 显示记忆结果
 */
function displayMemories(ui: UserInterface, memories: Memory[]): void {
  ui.showSuccess(`找到 ${memories.length} 条记忆:`);
  
  memories.forEach((memory, index) => {
    ui.showResponse(`${index + 1}. ${memory.content}`);
    ui.showResponse(`   相似度: ${memory.similarity?.toFixed(4) || 'N/A'}`);
    ui.showResponse(`   时间: ${new Date(memory.timestamp).toLocaleString()}`);
  });
} 