import { 
  AISystem, 
  OpenAIModel, 
  BasicToolsPlugin, 
  GoalsPlugin, 
  MemoryPlugin,
  Logger,
  wrapError
} from '@agentkai/core';

/**
 * 系统服务，用于管理AISystem的初始化和获取
 */
export class SystemService {
  private static instance: SystemService;
  private logger: Logger;
  private aiSystem: AISystem | null = null;

  private constructor() {
    this.logger = new Logger('SystemService');
  }

  /**
   * 获取SystemService的单例实例
   */
  static getInstance(): SystemService {
    if (!SystemService.instance) {
      SystemService.instance = new SystemService();
    }
    return SystemService.instance;
  }

  /**
   * 初始化AI系统
   * @param config 系统配置
   */
  async initializeSystem(config: any): Promise<AISystem> {
    try {
      // 如果已存在，直接返回
      if (this.aiSystem) {
        return this.aiSystem;
      }

      // 创建模型
      const model = new OpenAIModel(config.modelConfig);
      
      // 先创建AISystem实例，没有插件
      this.aiSystem = new AISystem(config, model, []);
      
      // 然后创建插件并添加
      const goalsPlugin = new GoalsPlugin(this.aiSystem);
      const memoryPlugin = new MemoryPlugin(this.aiSystem.getMemorySystem());
      const basicToolsPlugin = new BasicToolsPlugin(this.aiSystem);
      
      // 使用插件管理器添加插件
      const pluginManager = this.aiSystem['pluginManager']; // 直接访问私有属性
      pluginManager.addPlugin(goalsPlugin);
      pluginManager.addPlugin(memoryPlugin);
      pluginManager.addPlugin(basicToolsPlugin);
      
      // 初始化系统
      await this.aiSystem.initialize();
      this.logger.info('系统初始化完成');
      this.logger.debug('当前日志级别', { level: Logger.getGlobalLogLevelName() });
      
      return this.aiSystem;
    } catch (error) {
      const wrappedError = wrapError(error, '系统初始化失败');
      this.logger.error('系统初始化失败', wrappedError);
      throw wrappedError;
    }
  }

  /**
   * 获取AI系统实例
   */
  getSystem(): AISystem | null {
    return this.aiSystem;
  }

  /**
   * 关闭系统，释放资源
   */
  async shutdownSystem(): Promise<void> {
    if (this.aiSystem) {
      try {
        // 假设AISystem有关闭方法
        // await this.aiSystem.shutdown();
        this.aiSystem = null;
        this.logger.info('系统已关闭');
      } catch (error) {
        this.logger.error('系统关闭失败', error);
      }
    }
  }
} 