import { Logger } from '../../utils/logger';
import { ToolService } from '../../services/tools';
import { Plugin } from '../AISystem';

/**
 * 插件管理器
 * 负责插件的加载、初始化和管理
 */
export class PluginManager {
  private plugins: Plugin[] = [];
  private logger: Logger;
  private toolService: ToolService;
  
  /**
   * 构造函数
   * @param plugins 初始插件列表
   */
  constructor(plugins: Plugin[] = []) {
    this.plugins = [...plugins];
    this.logger = new Logger('PluginManager');
    this.toolService = ToolService.getInstance();
    this.logger.info(`插件管理器初始化，加载了 ${plugins.length} 个插件`);
  }
  
  /**
   * 初始化所有插件
   */
  async initialize(): Promise<void> {
    this.logger.info('开始初始化插件...');
    
    if (this.plugins.length === 0) {
      this.logger.warn('没有加载任何插件，系统功能可能受限');
      return;
    }
    
    // 注册所有插件提供的工具
    this.registerPluginTools();
  }
  
  /**
   * 注册所有插件的工具
   */
  private registerPluginTools(): void {
    this.logger.info(`注册 ${this.plugins.length} 个插件的工具...`);
    
    for (const plugin of this.plugins) {
      try {
        const tools = plugin.getTools();
        this.toolService.registerTools(tools);
        this.logger.info(`成功注册插件 ${plugin.getName()} 的工具，共 ${tools.length} 个`);
      } catch (error) {
        this.logger.error(`注册插件 ${plugin.getName()} 的工具失败`, error);
      }
    }
    
    this.logger.info(`工具服务中已注册共计 ${this.toolService.getAllTools().length} 个工具`);
  }
  
  /**
   * 添加插件
   * @param plugin 要添加的插件
   */
  addPlugin(plugin: Plugin): void {
    // 检查插件是否已存在
    const existingPlugin = this.plugins.find(p => p.getName() === plugin.getName());
    if (existingPlugin) {
      this.logger.warn(`插件 ${plugin.getName()} 已存在，将被替换`);
      this.removePlugin(plugin.getName());
    }
    
    this.plugins.push(plugin);
    
    // 注册新插件的工具
    try {
      const tools = plugin.getTools();
      this.toolService.registerTools(tools);
      this.logger.info(`成功注册插件 ${plugin.getName()} 的工具，共 ${tools.length} 个`);
    } catch (error) {
      this.logger.error(`注册插件 ${plugin.getName()} 的工具失败`, error);
    }
  }
  
  /**
   * 移除插件
   * @param pluginName 插件名称
   * @returns 是否成功移除
   */
  removePlugin(pluginName: string): boolean {
    const initialCount = this.plugins.length;
    this.plugins = this.plugins.filter(p => p.getName() !== pluginName);
    
    const removed = initialCount > this.plugins.length;
    if (removed) {
      this.logger.info(`插件 ${pluginName} 已移除`);
    } else {
      this.logger.warn(`插件 ${pluginName} 不存在，无法移除`);
    }
    
    return removed;
  }
  
  /**
   * 获取所有插件
   */
  getAllPlugins(): Plugin[] {
    return [...this.plugins];
  }
  
  /**
   * 获取特定名称的插件
   * @param name 插件名称
   */
  getPluginByName(name: string): Plugin | undefined {
    return this.plugins.find(p => p.getName() === name);
  }
  
  /**
   * 获取所有插件提供的工具
   */
  getAllTools(): any[] {
    const allTools: any[] = [];
    for (const plugin of this.plugins) {
      try {
        const tools = plugin.getTools();
        allTools.push(...tools);
      } catch (error) {
        this.logger.error(`获取插件 ${plugin.getName()} 的工具失败`, error);
      }
    }
    return allTools;
  }
  
  /**
   * 清空所有插件
   */
  clearPlugins(): void {
    this.plugins = [];
    this.logger.info('所有插件已清空');
  }
} 