/**
 * 三层架构导出文件
 * 提供所有架构组件的统一导出
 */

// UI层
export { UserInterface } from './ui/interfaces';
export { ConsoleUI } from './ui/console';

// 服务层
export { ConfigService } from './services/config';
export { ToolService, ToolHandler, Tool, ToolRegistration } from './services/tools';

// 适配器层
export { SystemAdapter } from './core/adapter';

// 记忆类型
export { Memory, CreateMemoryInput, MemoryType } from './types/memory';

// 工具插件
export { BasicToolsPlugin } from './plugins/basic-tools';

// 公共工具
export { LoggingMiddleware } from './utils/logging';
export { Logger, LogLevel } from './utils/logger';

/**
 * 三层架构说明
 * 
 * 本架构设计实现了界面层、业务服务层和数据层的分离，遵循了以下原则：
 * 
 * 1. 单一职责原则 - 每个类和模块只负责单一功能
 * 2. 接口隔离原则 - 接口精确定义，不包含不必要的方法
 * 3. 依赖倒置原则 - 高层模块通过接口依赖底层模块
 * 
 * 主要组件：
 * 
 * - UserInterface: 用户界面抽象，定义UI交互方法
 * - ConsoleUI: 命令行界面实现
 * - ConfigService: 统一配置管理服务
 * - ToolService: 工具管理服务
 * - SystemAdapter: 系统适配器，连接旧系统
 * - LoggingMiddleware: 日志中间件，提供日志管理
 * 
 * 使用示例:
 * 
 * ```typescript
 * // 1. 初始化服务
 * const config = ConfigService.getInstance();
 * await config.initialize();
 * 
 * // 2. 创建系统适配器
 * const adapter = new SystemAdapter(aiSystem);
 * 
 * // 3. 创建用户界面
 * const ui = new ConsoleUI();
 * 
 * // 4. 注册工具
 * const toolService = ToolService.getInstance();
 * const basicTools = new BasicToolsPlugin(aiSystem);
 * toolService.registerTools(basicTools.getTools());
 * 
 * // 5. 使用系统
 * ui.showWelcome(`系统初始化完成, 版本: ${config.getVersion()}`);
 * const memory = await adapter.addMemory({
 *   content: '这是一条测试记忆',
 *   importance: 8,
 *   type: 'fact'
 * });
 * ```
 */ 