import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { DefaultToolCallProcessor, ToolCallProcessor } from '../core/tools/ToolCallProcessor';
import { AIModel, Context, Decision, IGenerateStreamWithToolsParams } from '../types';
import { ModelConfig } from '../types/config';
import { Message, StreamChunk } from '../types/message';
import { Logger } from '../utils/logger';

export class OpenAIModel implements AIModel {
    private client: OpenAI;
    private config: ModelConfig;
    private logger: Logger;
    private toolCallProcessor: ToolCallProcessor;

    constructor(config: ModelConfig, toolCallProcessor?: ToolCallProcessor) {
        this.config = config;
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.apiBaseUrl,
            dangerouslyAllowBrowser: true,
        });
        this.logger = new Logger('OpenAIModel');
        this.toolCallProcessor = toolCallProcessor || new DefaultToolCallProcessor();
    }

    async generateText(prompt: string): Promise<string> {
        try {
            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
            });

            return response.choices[0].message?.content || '';
        } catch (error) {
            this.logger.error('生成文本失败:', error);
            throw error;
        }
    }

    async generateDecision(context: Context): Promise<Decision> {
        try {
            const prompt = this.buildDecisionPrompt(context);
            const response = await this.generateText(prompt);

            const parsed = JSON.parse(response);
            return {
                id: uuidv4(),
                action: parsed.action || 'respond',
                confidence: parsed.confidence || 0.5,
                reasoning: parsed.reasoning || '基于输入生成的决策',
                timestamp: Date.now(),
                context: {
                    memories: context.memories.map((m) => m.content),
                    tools: context.tools.map((t) => t.name),
                    goals: [],
                },
            };
        } catch (error) {
            this.logger.error('解析决策失败:', error);
            return {
                id: uuidv4(),
                action: 'error',
                confidence: 0.5,
                reasoning: '解析决策失败',
                timestamp: Date.now(),
                context: {
                    memories: [],
                    tools: [],
                    goals: [],
                },
            };
        }
    }

    private buildDecisionPrompt(context: Context): string {
        const memories = context.memories.map((m) => m.content).join('\n');
        const tools = context.tools.map((t) => t.name).join(', ');

        return `基于以下信息做出决策：

记忆：
${memories}

可用工具：
${tools}

环境信息：
${JSON.stringify(context.environment, null, 2)}

请以JSON格式返回决策，包含以下字段：
{
    "action": "要执行的动作",
    "confidence": 0-1之间的数字,
    "reasoning": "推理过程"
}`;
    }

    private mapMessageToOpenAI(msg: Message): OpenAI.ChatCompletionMessageParam {
        if (msg.role === 'assistant' && 'tool_calls' in msg && msg.tool_calls) {
            return {
                role: 'assistant',
                content: msg.content,
                tool_calls: msg.tool_calls.map((toolCall) => ({
                    id: toolCall.id,
                    type: 'function',
                    function: {
                        name: toolCall.function.name,
                        arguments: JSON.stringify(toolCall.function.arguments),
                    },
                })),
            };
        }

        if (msg.role === 'tool' && 'tool_call_id' in msg) {
            return {
                role: 'tool',
                content: msg.content || '',
                tool_call_id: msg.tool_call_id,
            };
        }

        return {
            role: msg.role,
            content: msg.content || '',
        };
    }

    async generateResponse(
        messages: Message[]
    ): Promise<{ response: string; tokens: { prompt: number; completion: number } }> {
        try {
            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages: messages.map(this.mapMessageToOpenAI),
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
            });

            return {
                response: response.choices[0].message?.content || '',
                tokens: {
                    prompt: response.usage?.prompt_tokens || 0,
                    completion: response.usage?.completion_tokens || 0,
                },
            };
        } catch (error) {
            this.logger.error('生成响应失败:', error);
            throw error;
        }
    }

    async *generateStream(messages: Message[]): AsyncGenerator<StreamChunk> {
        try {
            const stream = await this.client.chat.completions.create({
                model: this.config.model,
                messages: messages.map(this.mapMessageToOpenAI),
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
                stream: true,
            });

            // 重置工具调用处理器
            this.toolCallProcessor.reset();

            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                if (!delta) continue;

                if (delta.content) {
                    yield {
                        type: 'text',
                        content: delta.content,
                    };
                }

                if (delta.tool_calls) {
                    for (const toolCall of delta.tool_calls) {
                        if (toolCall.function?.arguments) {
                            // 使用工具调用处理器处理参数增量
                            const processedToolCall = this.toolCallProcessor.processToolCallDelta(
                                toolCall.index,
                                toolCall
                            );

                            // 如果工具调用处理完成，则生成工具调用事件
                            if (processedToolCall) {
                                yield {
                                    type: 'tool_call',
                                    content: processedToolCall,
                                };
                            }
                        }
                    }
                }
            }
        } catch (error) {
            this.logger.error('流式生成失败:', error);
            yield {
                type: 'error',
                content: error instanceof Error ? error.message : '流式生成失败',
            };
        }
    }

    async *generateStreamWithTools(
        params: IGenerateStreamWithToolsParams
    ): AsyncGenerator<StreamChunk> {
        try {
            const { 
                messages, 
                tools, 
                onAddChunk  // 新增参数：onAddChunk 回调函数
            } = params;
            
            const stream = await this.client.chat.completions.create({
                model: this.config.model,
                messages,
                tools: tools.map((tool) => ({
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters as any,
                    },
                })),
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
                stream: true,
            });

            // 重置工具调用处理器
            this.toolCallProcessor.reset();
            
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                if (!delta) continue;

                if (delta.content) {
                    const textContent = delta.content;
                    
                    // 使用 onAddChunk 回调而不是直接更新 PartsTracker
                    if (onAddChunk) {
                        onAddChunk({ type: 'text', text: textContent });
                    }
                    
                    yield {
                        type: 'text',
                        content: textContent,
                    };
                }

                if (delta.tool_calls) {
                    for (let i = 0; i < delta.tool_calls.length; i++) {
                        const toolCallDelta: OpenAI.ChatCompletionChunk.Choice.Delta.ToolCall =
                            delta.tool_calls[i];
                        // 使用工具调用处理器处理增量
                        const processedToolCall = this.toolCallProcessor.processToolCallDelta(
                            i,
                            toolCallDelta
                        );

                        // 如果工具调用处理完成，则生成工具调用事件
                        if (processedToolCall) {
                            this.logger.debug('生成工具调用:', {
                                toolCall: processedToolCall,
                                index: i,
                                toolCallDelta: toolCallDelta,
                            });
                            
                            // 使用 onAddChunk 回调而不是直接更新 PartsTracker
                            if (onAddChunk) {
                                onAddChunk({ type: 'tool_call', toolCall: processedToolCall });
                            }
                            
                            yield {
                                type: 'tool_call',
                                content: processedToolCall,
                            };
                        }
                    }
                }
            }
            
        } catch (error) {
            this.logger.error('流式工具调用失败:', error);
            yield {
                type: 'error',
                content: error instanceof Error ? error.message : '流式工具调用失败',
            };
        }
    }
}
