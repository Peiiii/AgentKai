import { JSONSchemaDefinition } from ".";


// 工具相关类型

export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required: boolean;
    default?: any;
}
/**
 * 工具处理函数类型
 */

export type ToolHandler<T = any, R = any> = (args: T) => Promise<R>;
/**
 * 工具定义接口
 */

export interface Tool<T = any, R = any> {
    name: string;
    description: string;
    parameters: JSONSchemaDefinition; // 这里改回any以保持向后兼容
    handler: ToolHandler<T, R>;
}/**
 * 工具注册配置
 */

export interface ToolRegistration<T = any, R = any> extends Omit<Tool<T, R>, 'handler'> {
    handler: ToolHandler<T, R>;
}

