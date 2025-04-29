import { ToolCall } from "@agentkai/core";

/**
 * JSON Schema 属性定义
 */
export interface JSONSchemaProperty {
    type: 'string' | 'number' | 'boolean' | 'object' | 'integer' | 'array';
    description?: string;
    enum?: string[];
    items?: JSONSchemaProperty;
    properties?: Record<string, JSONSchemaProperty>;
    required?: string[];
}

/**
 * 工具定义
 */
export interface Tool<TArgs = unknown, TResult = unknown> {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, JSONSchemaProperty>;
        required?: string[];
    };
    handler: (args: TArgs) => Promise<TResult>;
}

/**
 * 工具调用结果
 */
export interface ToolResult {
    success: boolean;
    data?: unknown;
    error?: string;
    toolCall: ToolCall;
} 