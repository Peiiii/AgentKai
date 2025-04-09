import { Tool, ToolRegistration } from '../types';
import { Logger } from '../utils/logger';

// /**
//  * 工具参数类型定义
//  */
// export interface ToolParameter {
//     name: string;
//     type: 'string' | 'number' | 'boolean' | 'object' | 'array';
//     description: string;
//     required: boolean;
//     default?: any;
// }

/**
//  * 工具参数集合
//  */
// export interface ToolParameters {
//     [key: string]: any; // 这里改回any以保持向后兼容
// }

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
    registerTool<T = Record<string, any>, R = any>(tool: ToolRegistration<T, R>): void {
        if (this.tools.has(tool.name)) {
            this.logger.warn(`工具 ${tool.name} 已存在，将被覆盖`);
        }

        // 验证工具定义是否完整
        if (!tool.name || typeof tool.name !== 'string') {
            throw new Error('工具名称必须是非空字符串');
        }

        if (!tool.description || typeof tool.description !== 'string') {
            throw new Error(`工具 ${tool.name} 缺少描述`);
        }

        if (!tool.handler || typeof tool.handler !== 'function') {
            throw new Error(`工具 ${tool.name} 缺少处理函数`);
        }

        this.tools.set(tool.name, tool as Tool);
        this.logger.info(`成功注册工具: ${tool.name}`);
    }

    /**
     * 批量注册工具
     * @param tools 工具配置数组
     */
    registerTools<T = Record<string, any>, R = any>(tools: ToolRegistration<T, R>[]): void {
        if (!Array.isArray(tools)) {
            this.logger.error('registerTools方法需要一个数组参数');
            return;
        }

        for (const tool of tools) {
            try {
                this.registerTool(tool);
            } catch (error) {
                this.logger.error(`注册工具 ${tool?.name || '未知'} 失败`, error);
            }
        }
    }

    /**
     * 获取所有已注册工具
     */
    getAllTools(): Tool[] {
        return Array.from(this.tools.values());
    }

    /**
     * 获取工具定义（无处理函数）
     */
    getToolDefinitions(): Omit<Tool, 'handler'>[] {
        return Array.from(this.tools.values()).map(({ name, description, parameters }) => ({
            name,
            description,
            parameters,
        }));
    }

    /**
     * 检查工具是否存在
     * @param name 工具名称
     */
    hasTool(name: string): boolean {
        return this.tools.has(name);
    }

    /**
     * 执行工具
     * @param name 工具名称
     * @param args 工具参数
     */
    async executeTool<T = Record<string, any>, R = any>(name: string, args: T): Promise<R> {
        if (!this.tools.has(name)) {
            const error = `请求的工具 ${name} 不存在`;
            this.logger.error(error);
            throw new Error(error);
        }

        const tool = this.tools.get(name) as Tool<T, R>;

        try {
            this.logger.info(`执行工具: ${name}，参数:`, args);
            const result = await tool.handler(args);
            this.logger.info(`工具 ${name} 执行成功`);
            return result;
        } catch (error) {
            this.logger.error(`工具 ${name} 执行失败`, error);
            throw error;
        }
    }

    /**
     * 取消注册工具
     * @param name 工具名称
     */
    unregisterTool(name: string): boolean {
        if (!this.tools.has(name)) {
            this.logger.warn(`工具 ${name} 不存在，无法取消注册`);
            return false;
        }

        const result = this.tools.delete(name);
        this.logger.info(`工具 ${name} 已取消注册`);
        return result;
    }
}
