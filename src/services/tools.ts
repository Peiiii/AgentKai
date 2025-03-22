import { Logger } from '../utils/logger';

/**
 * 工具处理函数类型
 */
export type ToolHandler = (args: any) => Promise<any>;

/**
 * 工具定义接口
 */
export interface Tool {
  name: string;
  description: string;
  parameters: any;
  handler: ToolHandler;
}

/**
 * 工具注册配置
 */
export interface ToolRegistration extends Omit<Tool, 'handler'> {
  handler: ToolHandler;
}

/**
 * 工具管理服务，负责工具的注册和执行
 */
export class ToolService {
  private static instance: ToolService;
  private tools: Map<string, Tool> = new Map();
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('ToolService');
  }

  /**
   * 获取ToolService单例
   */
  static getInstance(): ToolService {
    if (!ToolService.instance) {
      ToolService.instance = new ToolService();
    }
    return ToolService.instance;
  }

  /**
   * 注册工具
   * @param tool 工具配置
   */
  registerTool(tool: ToolRegistration): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`工具 ${tool.name} 已存在，将被覆盖`);
    }

    this.tools.set(tool.name, {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      handler: tool.handler
    });

    this.logger.debug(`工具 ${tool.name} 已注册`);
  }

  /**
   * 批量注册工具
   * @param tools 工具配置数组
   */
  registerTools(tools: ToolRegistration[]): void {
    tools.forEach(tool => this.registerTool(tool));
  }

  /**
   * 获取所有注册的工具
   * @returns 所有工具的定义
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 获取所有工具定义(不包含处理函数)
   * @returns 工具定义数组
   */
  getToolDefinitions(): Omit<Tool, 'handler'>[] {
    return this.getAllTools().map(({ name, description, parameters }) => ({
      name,
      description,
      parameters
    }));
  }

  /**
   * 检查工具是否存在
   * @param name 工具名称
   * @returns 是否存在
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 执行工具
   * @param name 工具名称
   * @param args 工具参数
   * @returns 工具执行结果
   */
  async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    
    if (!tool) {
      const error = `工具 ${name} 不存在`;
      this.logger.error(error);
      throw new Error(error);
    }

    try {
      this.logger.debug(`执行工具 ${name}`, { args });
      const result = await tool.handler(args);
      return result;
    } catch (error) {
      this.logger.error(`工具 ${name} 执行失败`, error);
      throw error;
    }
  }

  /**
   * 卸载工具
   * @param name 工具名称
   * @returns 是否成功卸载
   */
  unregisterTool(name: string): boolean {
    if (this.tools.has(name)) {
      this.tools.delete(name);
      this.logger.debug(`工具 ${name} 已卸载`);
      return true;
    }
    return false;
  }
} 