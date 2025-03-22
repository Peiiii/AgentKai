import { Tool, ToolCall, ToolResult } from '../types';
/**
 * 工具调用格式接口
 */
export interface ToolCallFormat {
    extractToolCall(text: string): ToolCall | null;
    formatToolResult(result: ToolResult): string;
    generateToolGuide(): string;
    formatToolDefinition(tool: Tool): string;
}
/**
 * 默认的工具调用格式实现 - 使用[工具调用]...[/工具调用]格式
 */
export declare class DefaultToolCallFormat implements ToolCallFormat {
    extractToolCall(text: string): ToolCall | null;
    formatToolResult(result: ToolResult): string;
    private formatResultItem;
    generateToolGuide(): string;
    formatToolDefinition(tool: Tool): string;
}
/**
 * 工具管理器：负责工具注册、查找和执行
 */
export declare class ToolManager {
    private tools;
    private format;
    private logger;
    constructor(format?: ToolCallFormat);
    /**
     * 注册工具
     */
    registerTool(tool: Tool): void;
    /**
     * 注册多个工具
     */
    registerTools(tools: Tool[]): void;
    /**
     * 获取工具
     */
    getTool(id: string): Tool | undefined;
    /**
     * 获取所有工具
     */
    getAllTools(): Tool[];
    /**
     * 获取格式化后的工具定义列表
     */
    getFormattedToolDefinitions(): string[];
    /**
     * 获取工具调用指南
     */
    getToolGuide(): string;
    /**
     * 从文本中提取并执行工具调用
     */
    processToolCall(text: string): Promise<{
        toolCalled: boolean;
        resultText: string;
        modifiedText: string;
    }>;
    /**
     * 执行工具
     */
    executeTool(toolId: string, parameters: Record<string, any>, toolCall?: ToolCall): Promise<ToolResult>;
    getToolsByCategory(category: Tool['category']): Tool[];
}
