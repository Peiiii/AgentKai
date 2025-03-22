import { AIModel } from '../../types';
import { Logger } from '../../utils/logger';
import { ToolService } from '../../services/tools';

/**
 * 响应处理器
 * 负责处理AI响应，包括解析和执行工具调用
 */
export class ResponseProcessor {
    private logger: Logger;
    private toolService: ToolService;

    /**
     * 构造函数
     * @param logger 日志记录器
     */
    constructor(logger: Logger) {
        this.logger = logger;
        this.toolService = ToolService.getInstance();
    }

    /**
     * 处理响应中的工具调用
     * @param response AI响应文本
     * @returns 处理结果
     */
    async processToolsInResponse(response: string): Promise<{
        toolCalled: boolean;
        modifiedText: string;
        extraTokens?: { prompt: number; completion: number };
    }> {
        // 检查新格式的工具调用 [[工具名(参数)]]
        const toolPattern = /\[\[(\w+)\((.*?)\)\]\]/g;
        let toolCalled = false;
        let modifiedText = response;
        let match;

        this.logger.debug(`处理响应中的工具调用: ${response}`);

        // 检查是否有工具调用格式 [[工具名(参数)]]
        while ((match = toolPattern.exec(response)) !== null) {
            toolCalled = true;
            const toolName = match[1];
            const paramStr = match[2];
            let params: Record<string, any> = {};

            try {
                // 改进参数解析逻辑，提高健壮性
                if (paramStr.includes(':')) {
                    // 处理键值对参数格式
                    // 使用正则表达式将所有键加上双引号
                    const jsonStr = `{${paramStr}}`.replace(/(\w+):/g, '"$1":');

                    try {
                        params = JSON.parse(jsonStr);
                    } catch (parseError) {
                        // 如果解析失败，尝试使用更健壮的方式处理
                        this.logger.warn(
                            `参数解析失败，尝试使用备用方式解析: ${jsonStr}`,
                            parseError
                        );

                        // 使用正则表达式匹配键值对
                        const pairs = paramStr.match(
                            /(\w+):\s*("[^"]*"|\d+|\{[^}]*\}|\[[^\]]*\]|true|false|null|\w+)/g
                        );
                        if (pairs) {
                            pairs.forEach((pair) => {
                                const [key, value] = pair.split(':').map((p) => p.trim());
                                // 根据值的类型进行适当转换
                                try {
                                    params[key] = JSON.parse(value);
                                } catch {
                                    // 如果无法解析为JSON，则保留原始字符串
                                    params[key] = value.replace(/^"|"$/g, ''); // 移除可能的引号
                                }
                            });
                        } else {
                            throw new Error(`无法解析参数: ${paramStr}`);
                        }
                    }
                } else if (paramStr.trim()) {
                    // 处理单一参数的情况
                    // 检查是否是JSON字符串
                    if (
                        (paramStr.startsWith('"') && paramStr.endsWith('"')) ||
                        (paramStr.startsWith('{') && paramStr.endsWith('}')) ||
                        (paramStr.startsWith('[') && paramStr.endsWith(']'))
                    ) {
                        try {
                            const parsed = JSON.parse(paramStr);
                            if (typeof parsed === 'object' && parsed !== null) {
                                params = parsed;
                            } else {
                                params = { query: parsed };
                            }
                        } catch {
                            params = { query: paramStr.replace(/^"|"$/g, '') };
                        }
                    } else {
                        params = { query: paramStr };
                    }
                }

                this.logger.info(`检测到工具调用: ${toolName} 参数: ${JSON.stringify(params)}`);

                if (this.toolService.hasTool(toolName)) {
                    // 执行工具
                    const result = await this.toolService.executeTool(toolName, params);
                    const resultText = JSON.stringify(result, null, 2);

                    // 替换工具调用为结果
                    modifiedText = modifiedText.replace(match[0], `工具调用结果:\n${resultText}`);
                } else {
                    this.logger.warn(`未找到工具: ${toolName}`);
                    modifiedText = modifiedText.replace(
                        match[0],
                        `工具调用错误: 未找到工具 "${toolName}"`
                    );
                }
            } catch (error) {
                this.logger.error(`工具调用失败: ${toolName}`, error);
                modifiedText = modifiedText.replace(
                    match[0],
                    `工具调用错误: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }

        // 返回处理结果
        return {
            toolCalled,
            modifiedText,
            extraTokens: { prompt: 0, completion: 0 },
        };
    }
}
