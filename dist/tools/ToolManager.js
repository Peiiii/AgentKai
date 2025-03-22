"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolManager = exports.DefaultToolCallFormat = void 0;
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
/**
 * 默认的工具调用格式实现 - 使用[工具调用]...[/工具调用]格式
 */
class DefaultToolCallFormat {
    extractToolCall(text) {
        const match = text.match(/\[工具调用\]([\s\S]*?)\[\/工具调用\]/);
        if (!match)
            return null;
        const content = match[1].trim();
        const toolIdMatch = content.match(/工具ID:\s*(.*)/i);
        if (!toolIdMatch)
            return null;
        const toolId = toolIdMatch[1].trim();
        // 提取参数
        const parameters = {};
        const paramIndex = content.indexOf('参数:');
        if (paramIndex !== -1) {
            const paramsText = content.substring(paramIndex + 3).trim();
            const paramLines = paramsText.split('\n');
            for (const line of paramLines) {
                const paramMatch = line.match(/^\s*-\s*(.*?):\s*(.*)/);
                if (paramMatch) {
                    parameters[paramMatch[1].trim()] = paramMatch[2].trim();
                }
            }
        }
        return {
            toolId,
            parameters,
            originalText: match[0]
        };
    }
    formatToolResult(result) {
        if (result.success) {
            let resultDescription = '';
            const toolName = result.toolCall.toolId;
            // 根据工具类型和结果格式化输出
            if (typeof result.data === 'string') {
                resultDescription = result.data;
            }
            else if (Array.isArray(result.data)) {
                resultDescription = `找到 ${result.data.length} 条结果`;
                if (result.data.length > 0) {
                    resultDescription += ':\n' + result.data.map((item, i) => `${i + 1}. ${this.formatResultItem(item)}`).join('\n');
                }
            }
            else if (result.data && typeof result.data === 'object') {
                if (result.data.message) {
                    resultDescription = result.data.message;
                }
                else {
                    resultDescription = `工具 ${toolName} 执行成功。`;
                }
            }
            else {
                resultDescription = `工具 ${toolName} 执行成功。`;
            }
            return `[工具执行结果]\n${resultDescription}\n[/工具执行结果]`;
        }
        else {
            return `[工具执行失败]\n执行 ${result.toolCall.toolId} 工具时出错: ${result.error || '未知错误'}\n[/工具执行失败]`;
        }
    }
    formatResultItem(item) {
        if (typeof item === 'string') {
            return item;
        }
        else if (item && typeof item === 'object') {
            if (item.content) {
                return `${item.content.substring(0, 100)}${item.content.length > 100 ? '...' : ''}`;
            }
            else if (item.description) {
                return `[优先级:${item.priority || 'N/A'}] ${item.description} (进度: ${item.progress !== undefined ? Math.round(item.progress * 100) : 0}%)`;
            }
        }
        return JSON.stringify(item);
    }
    generateToolGuide() {
        return `如果需要使用工具，请使用以下格式：
[工具调用]
工具ID: <工具ID>
参数:
- <参数名>: <参数值>
- <参数名>: <参数值>
[/工具调用]

如果不需要使用工具，直接回答用户问题即可。`;
    }
    formatToolDefinition(tool) {
        const parameters = tool.parameters && tool.parameters.length > 0
            ? tool.parameters.map(p => {
                const required = p.required ? '(必填)' : '(可选)';
                const defaultValue = p.default !== undefined ? `，默认值: ${p.default}` : '';
                return `- ${p.name}: ${p.description} ${required}${defaultValue}`;
            }).join('\n')
            : '无参数';
        return `工具：${tool.name} (${tool.id})
描述：${tool.description}
参数：${parameters}`;
    }
}
exports.DefaultToolCallFormat = DefaultToolCallFormat;
/**
 * 工具管理器：负责工具注册、查找和执行
 */
class ToolManager {
    constructor(format = new DefaultToolCallFormat()) {
        this.tools = new Map();
        this.format = format;
        this.logger = new logger_1.Logger('ToolManager');
    }
    /**
     * 注册工具
     */
    registerTool(tool) {
        if (this.tools.has(tool.id)) {
            this.logger.warn(`工具 ${tool.id} 已存在，将被覆盖`);
        }
        this.tools.set(tool.id, tool);
        this.logger.info(`已注册工具: ${tool.name} (${tool.id})`);
    }
    /**
     * 注册多个工具
     */
    registerTools(tools) {
        tools.forEach(tool => this.registerTool(tool));
    }
    /**
     * 获取工具
     */
    getTool(id) {
        return this.tools.get(id);
    }
    /**
     * 获取所有工具
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }
    /**
     * 获取格式化后的工具定义列表
     */
    getFormattedToolDefinitions() {
        return this.getAllTools().map(tool => this.format.formatToolDefinition(tool));
    }
    /**
     * 获取工具调用指南
     */
    getToolGuide() {
        return this.format.generateToolGuide();
    }
    /**
     * 从文本中提取并执行工具调用
     */
    async processToolCall(text) {
        const toolCall = this.format.extractToolCall(text);
        if (!toolCall) {
            return {
                toolCalled: false,
                resultText: '',
                modifiedText: text
            };
        }
        this.logger.info(`检测到工具调用: ${toolCall.toolId}`, { parameters: toolCall.parameters });
        const result = await this.executeTool(toolCall.toolId, toolCall.parameters, toolCall);
        const formattedResult = this.format.formatToolResult(result);
        return {
            toolCalled: true,
            resultText: formattedResult,
            modifiedText: toolCall.originalText ? text.replace(toolCall.originalText, formattedResult) : text
        };
    }
    /**
     * 执行工具
     */
    async executeTool(toolId, parameters, toolCall) {
        const tool = this.tools.get(toolId);
        if (!tool) {
            const error = new errors_1.ToolError(`找不到ID为 ${toolId} 的工具`, 'TOOL_NOT_FOUND', toolId);
            this.logger.error(`工具未找到: ${toolId}`, error);
            return {
                success: false,
                error: error.message,
                toolCall: toolCall || { toolId, parameters, originalText: '' }
            };
        }
        try {
            // 验证参数
            if (tool.parameters) {
                for (const param of tool.parameters) {
                    if (param.required && (parameters[param.name] === undefined || parameters[param.name] === null)) {
                        const error = new errors_1.ToolError(`缺少必需参数: ${param.name}`, 'MISSING_REQUIRED_PARAMETER', toolId);
                        this.logger.error(`工具参数验证失败: ${toolId}`, error);
                        return {
                            success: false,
                            error: error.message,
                            toolCall: toolCall || { toolId, parameters, originalText: '' }
                        };
                    }
                    // 应用默认值
                    if (parameters[param.name] === undefined && param.default !== undefined) {
                        parameters[param.name] = param.default;
                    }
                    // TODO: 进行类型转换和验证
                }
            }
            this.logger.info(`执行工具 ${toolId} 开始`);
            const result = await tool.handler(parameters);
            this.logger.info(`执行工具 ${toolId} 完成`);
            return {
                success: true,
                data: result,
                toolCall: toolCall || { toolId, parameters, originalText: '' }
            };
        }
        catch (error) {
            const wrappedError = (0, errors_1.wrapError)(error, `执行工具 ${toolId} 失败`);
            if (!(wrappedError instanceof errors_1.ToolError)) {
                Object.defineProperty(wrappedError, 'toolId', { value: toolId });
            }
            this.logger.error(`执行工具 ${toolId} 失败`, error);
            return {
                success: false,
                error: wrappedError.message,
                toolCall: toolCall || { toolId, parameters, originalText: '' }
            };
        }
    }
    getToolsByCategory(category) {
        return this.getAllTools().filter(tool => tool.category === category);
    }
}
exports.ToolManager = ToolManager;
