import { ToolCall, ToolCallDelta } from '../../types/tool-call';
import { Logger } from '../../utils/logger';

/**
 * 工具调用处理器接口
 * 负责处理流式工具调用的累积和解析
 */
export interface ToolCallProcessor {
    /**
     * 处理工具调用增量
     * @param index 工具调用索引
     * @param delta 工具调用增量信息
     * @returns 如果工具调用已完成，返回完整的工具调用对象；否则返回null
     */
    processToolCallDelta(index: number, delta:  ToolCallDelta):  ToolCall | null;
    
    /**
     * 重置处理器状态
     */
    reset(): void;
}

/**
 * 默认工具调用处理器实现
 */
export class DefaultToolCallProcessor implements ToolCallProcessor {
    private toolCallData: Map<number,ToolCall> = new Map();
    private logger: Logger;
    
    constructor() {
        this.logger = new Logger('ToolCallProcessor');
    }
    
    processToolCallDelta(index: number, delta: ToolCallDelta): ToolCall | null {
        // 获取或创建工具调用数据
        let toolCallData = this.toolCallData.get(index);
        if (!toolCallData) {
            toolCallData = {
                id: '',
                function: {
                    name: '',
                    arguments: ''
                },
                type: 'function'
            };
            this.toolCallData.set(index, toolCallData);
        }
        
        // 更新工具调用数据
        if (delta.id !== undefined) {
            toolCallData.id += delta.id;
        }
        if (delta.function?.name !== undefined) {
            toolCallData.function!.name += delta.function.name;
        }
        if (delta.function?.arguments !== undefined) {
            toolCallData.function!.arguments += delta.function.arguments;
        }

        console.log("[DefaultToolCallProcessor] [processToolCallDelta] [new toolCallData]:", toolCallData);
        
        // 检查工具调用是否完成
        if (this.isToolCallComplete(toolCallData)) {
            try {
                // 处理完成后，从累积中移除
                this.toolCallData.delete(index);
                return toolCallData;
            } catch (error: unknown) {
                this.logger.debug(`工具调用参数解析失败: ${error instanceof Error ? error.message : '未知错误'}`, {
                    index,
                    toolCallData
                });
            }
        }
        
        // 如果工具调用不完整或解析失败，返回null
        return null;
    }
    
    reset(): void {
        this.toolCallData.clear();
    }
    
    /**
     * 检查工具调用是否完成
     */
    private isToolCallComplete(toolCallData: ToolCall): boolean {
        // 检查是否有ID和名称
        if (!toolCallData.id || !toolCallData.function?.name) {
            return false;
        }
        
        // 检查参数是否是完整的JSON
        return this.isCompleteJson(toolCallData.function!.arguments!||"");
    }
    
    /**
     * 检查字符串是否是完整的JSON
     * 简单实现，可能不适用于所有情况
     */
    private isCompleteJson(str: string): boolean {
        try {
            // 尝试解析JSON
            JSON.parse(str);
            return true;
        } catch (e: unknown) {
            // 检查是否是未闭合的对象或数组
            const openBraces = (str.match(/{/g) || []).length;
            const closeBraces = (str.match(/}/g) || []).length;
            const openBrackets = (str.match(/\[/g) || []).length;
            const closeBrackets = (str.match(/\]/g) || []).length;
            
            // 如果括号数量不匹配，则不是完整的JSON
            if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
                return false;
            }
            
            // 检查引号是否配对
            const openQuotes = (str.match(/"/g) || []).length;
            if (openQuotes % 2 !== 0) {
                return false;
            }
            
            // 其他情况，可能是有效的JSON
            return true;
        }
    }
} 