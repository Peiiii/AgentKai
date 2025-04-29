import { GoalManager } from '../goals/GoalManager';
import { MemorySystem } from '../memory/MemorySystem';
import { EmbeddingProvider, OpenAIEmbeddingProvider } from '../memory/embedding';
import { ISearchProvider } from '../memory/embedding/ISearchProvider';
import { BaseConfigService } from '../services/config';
import { StorageProvider } from '../storage/StorageProvider';
import { AIModel, Goal, GoalStatus, SystemResponse } from '../types';
import { Memory } from '../types/memory';
import { MemoryType } from '../types/memory';
import { Tool } from '../types/tool';
import { AgentKaiConfig } from '../types/config';
import { ToolCall } from '../types/tool-call';
import { ToolResult } from '../types/ui-message';
import { ModelError, wrapError } from '../utils/errors';
import { Logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performance';
import { ConversationManager } from './conversation/ConversationManager';
import { PluginManager } from './plugins/PluginManager';
import { Plugin } from './plugins/plugin';
import { PromptBuilder } from './prompts/PromptBuilder';
import { MessageChunk, MessagePart, PartsTracker, PartsTrackerEvent } from './response/PartsTracker';
import { ResponseProcessor } from './response/ResponseProcessor';
import { ToolManager } from './tools/ToolManager';
import { DefaultToolCallProcessor, ToolCallProcessor } from './tools/ToolCallProcessor';

/**
 * AISystem作为核心协调类，负责整合和管理各个子系统
 */
export class BaseAISystem {
    public memory: MemorySystem;
    private goals: GoalManager;
    private model: AIModel;
    private logger: Logger;
    private performance: PerformanceMonitor;
    private requestTimeoutMs: number = 30000; // 默认请求超时时间为30秒
    private config: AgentKaiConfig | null = null;

    // 新的组件
    public conversation: ConversationManager;
    public pluginManager: PluginManager;
    private responseProcessor: ResponseProcessor;
    private promptBuilder: PromptBuilder;
    private toolCallProcessor: ToolCallProcessor;
    public toolManager: ToolManager;

    private configService: BaseConfigService;

    constructor(
        config: AgentKaiConfig,
        model: AIModel,
        plugins: Plugin[] = [],
        toolCallProcessor?: ToolCallProcessor
    ) {
        this.logger = new Logger('AISystem');
        this.performance = new PerformanceMonitor('AISystem');
        this.config = config;
        this.model = model;
        this.configService = this.createConfigService();
        this.toolCallProcessor = toolCallProcessor || new DefaultToolCallProcessor();
        
        // 初始化工具管理器
        this.toolManager = new ToolManager();

        // 初始化记忆系统
        this.memory = this.createMemorySystem();

        // 初始化目标系统
        this.goals = this.createGoalManager();

        // 初始化新组件
        this.conversation = new ConversationManager(10); // 保留最近10条消息
        this.pluginManager = new PluginManager(this.toolManager, plugins);
        this.responseProcessor = new ResponseProcessor(this.logger);
        this.promptBuilder = new PromptBuilder(config, this.conversation, this.memory, this.goals);
    }

    createConfigService(): BaseConfigService {
        throw new Error('Not implemented');
    }

    getConfigService(): BaseConfigService {
        return this.configService;
    }

    createMemorySystem(): MemorySystem {
        const embeddingProvider = this.createEmbeddingProvider();

        // 创建内存存储
        const memoryStorage = this.createMemoryStorage();

        // 使用SearchProviderFactory创建搜索提供者
        const searchProvider = this.createMemorySearchProvider();
        // 初始化记忆系统
        this.memory = new MemorySystem(memoryStorage, embeddingProvider, searchProvider);
        return this.memory;
    }

    createMemoryStorage(): StorageProvider<Memory> {
        throw new Error('Not implemented');
    }

    createEmbeddingProvider(): EmbeddingProvider {
        const config = this.config!;
        return new OpenAIEmbeddingProvider(
            config.modelConfig.apiKey,
            config.modelConfig.embeddingModel || 'text-embedding-ada-002',
            config.modelConfig.embeddingBaseUrl,
            config.modelConfig.embeddingDimensions || 1024
        );
    }

    createMemorySearchProvider(): ISearchProvider {
        throw new Error('Not implemented');
    }

    createGoalManager(): GoalManager {
        const goalStorage = this.createGoalStorage();
        return new GoalManager(goalStorage);
    }

    createGoalStorage(): StorageProvider<Goal> {
        throw new Error('Not implemented');
    }

    async initialize(): Promise<void> {
        // 初始化目标系统
        await this.goals.initialize();
        // 初始化插件管理器
        await this.pluginManager.initialize();

        await this.memory.initialize();

        this.logger.info('AI系统初始化完成');
    }

    getGoalManager(): GoalManager {
        return this.goals;
    }

    getMemorySystem(): MemorySystem {
        return this.memory;
    }
    
    getToolManager(): ToolManager {
        return this.toolManager;
    }

    async processInput(input: string): Promise<SystemResponse> {
        // 检查是否是退出命令
        if (input.toLowerCase() === 'exit') {
            // 保存对话历史到记忆系统
            await this.memory.createMemory('对话结束', MemoryType.CONVERSATION, {
                role: 'system',
                history: this.conversation.getHistory(),
            });
            // 清空对话历史
            this.conversation.clear();
            return {
                output: '再见！',
                relevantMemories: [],
                activeGoals: [],
            };
        }

        this.logger.info('处理用户输入开始');
        this.performance.start('processInput');

        try {
            // 1. 获取相关记忆
            this.performance.start('searchMemories');
            const relevantMemories = await this.withTimeout(
                this.memory.searchMemories(input),
                this.requestTimeoutMs,
                '记忆搜索超时'
            );
            this.performance.end('searchMemories');

            // 2. 获取活跃目标
            this.performance.start('getActiveGoals');
            const activeGoals = await this.withTimeout(
                this.goals.getActiveGoals(),
                this.requestTimeoutMs,
                '获取目标超时'
            );
            this.logger.info(`当前活跃目标数量: ${activeGoals.length}`);
            activeGoals.forEach((goal) => {
                this.logger.debug(`目标信息: ${goal.description}`, {
                    progress: goal.progress,
                    priority: goal.priority,
                });
            });
            this.performance.end('getActiveGoals');

            // 3. 处理用户输入并生成回复
            this.performance.start('generateResponse');

            // 添加用户输入到对话历史
            this.conversation.addMessages({
                role: 'user',
                content: input,
            });

            // 构建上下文
            const messages = this.promptBuilder.buildContextMessages(
                this.conversation.getHistory(),
                relevantMemories,
                activeGoals,
                this.pluginManager.getAllTools()
            );

            // 生成回复
            let response, tokens;
            try {
                const result = await this.withTimeout(
                    this.model.generateResponse(messages),
                    this.requestTimeoutMs * 2, // 模型生成给2倍时间
                    '生成响应超时'
                );
                response = result.response;
                tokens = result.tokens;
            } catch (error) {
                this.logger.error('生成响应失败', error);
                throw wrapError(error, '生成响应失败');
            }

            // 处理可能的工具调用
            this.performance.start('processToolCalls');
            let totalPromptTokens = tokens.prompt;
            let totalCompletionTokens = tokens.completion;

            const processedResponse = await this.responseProcessor.processToolsInResponse(response);
            const finalOutput = processedResponse.modifiedText;

            // 如果有工具调用，递归处理会返回新生成的结果，需要更新token计数
            if (processedResponse.toolCalled && processedResponse.extraTokens) {
                totalPromptTokens += processedResponse.extraTokens.prompt || 0;
                totalCompletionTokens += processedResponse.extraTokens.completion || 0;
            }

            const finalTokens = {
                prompt: totalPromptTokens,
                completion: totalCompletionTokens,
                total: totalPromptTokens + totalCompletionTokens,
            };

            this.performance.end('processToolCalls');

            this.logger.info('Token 使用情况', {
                prompt: finalTokens.prompt,
                completion: finalTokens.completion,
                total: finalTokens.total,
            });
            this.performance.end('generateResponse');

            // 添加AI回复到对话历史（使用处理后的输出）
            this.conversation.addMessages({
                role: 'assistant',
                content: finalOutput,
            });

            // 不再自动添加记忆，由AI通过工具调用或用户手动添加
            this.logger.info('对话已存储到短期记忆，未自动添加到长期记忆');

            const totalTime = this.performance.end('processInput');
            this.logger.info(`处理用户输入完成，总耗时 ${totalTime}ms`);

            // 返回响应
            return {
                output: finalOutput.trim(),
                relevantMemories,
                activeGoals,
                tokens: finalTokens,
            };
        } catch (error) {
            this.performance.end('processInput'); // 确保即使出错也结束计时
            this.logger.error('处理用户输入失败', error);
            return {
                output: `处理您的请求时出错: ${error instanceof Error ? error.message : String(error)}`,
                relevantMemories: [],
                activeGoals: [],
            };
        }
    }

    /**
     * 添加超时机制的Promise包装
     */
    private async withTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number,
        message: string
    ): Promise<T> {
        let timeoutId: NodeJS.Timeout;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new ModelError(`${message} (${timeoutMs}ms)`));
            }, timeoutMs);
        });

        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            clearTimeout(timeoutId!);
        }
    }

    async addMemory(content: string, metadata: Record<string, any> = {}): Promise<Memory> {
        const type = metadata.type || MemoryType.OBSERVATION;
        return await this.memory.createMemory(content, type as MemoryType, metadata);
    }

    async searchMemories(query: string, limit: number = 10): Promise<Memory[]> {
        this.logger.info('开始搜索记忆:', query);
        return await this.memory.searchMemories(query, limit);
    }

    async getAllMemories(): Promise<Memory[]> {
        return this.memory.getAllMemories();
    }

    async deleteMemory(id: string): Promise<boolean> {
        return await this.memory.deleteMemory(id);
    }

    async clearMemories(): Promise<void> {
        await this.memory.clearMemories();
    }

    async addGoal(
        goal: Omit<Goal, 'id' | 'createdAt' | 'status' | 'progress' | 'updatedAt' | 'completedAt'>
    ): Promise<Goal> {
        return this.goals.addGoal(goal);
    }

    async getGoal(id: string): Promise<Goal | null> {
        return this.goals.getGoal(id);
    }

    async getActiveGoals(): Promise<Goal[]> {
        return this.goals.getActiveGoals();
    }

    async updateGoalStatus(goalId: string, status: GoalStatus): Promise<void> {
        await this.goals.updateGoalStatus(goalId, status);
    }

    async updateGoalProgress(goalId: string, progress: number): Promise<void> {
        await this.goals.updateGoalProgress(goalId, progress);
    }

    async clearGoals(): Promise<void> {
        await this.goals.clearGoals();
    }

    async getAllGoals(): Promise<Goal[]> {
        return this.goals.getAllGoals();
    }

    async deleteGoal(id: string): Promise<boolean> {
        return await this.goals.deleteGoal(id);
    }

    // 清除当前对话历史
    async clearCurrentConversation(): Promise<void> {
        this.logger.info('清除当前对话历史');
        this.conversation.clear();
        this.logger.info('对话历史已清除');
    }

    /**
     * 处理输入并返回流式响应
     * @param input 用户输入
     * @returns 流式响应
     */
    async *processInputStream(input: string): AsyncGenerator<SystemResponse> {
        try {
            // 构建提示
            const prompt = await this.promptBuilder.buildPrompt(input);

            // 使用模型生成流式响应
            const stream = await this.model.generateStream([{ role: 'user', content: prompt }]);

            // 处理每个响应块
            for await (const chunk of stream) {
                if (chunk.type === 'text') {
                    // 处理响应
                    const processedResponse = await this.responseProcessor.processResponse(
                        chunk.content as string
                    );

                    // 更新对话历史
                    await this.conversation.addMessages({
                        role: 'assistant',
                        content: processedResponse.output || '',
                    });

                    // 保存到记忆系统
                    await this.addMemory(processedResponse.output || '', {
                        type: MemoryType.CONVERSATION,
                        role: 'assistant',
                        importance: 5,
                    });

                    yield processedResponse;
                }
            }
        } catch (error) {
            this.logger.error('流式处理失败', error);
            throw wrapError(error, '流式处理失败');
        }
    }

    /**
     * 处理带工具支持的流式输入
     */
    public async processInputStreamWithTools(params: {
        input: string;
        tools: Tool[];
        onChunk?: (chunk: string) => void;
        onToolCall?: (toolCall: ToolCall) => void;
        onToolResult?: (toolResult: ToolResult<string, Record<string, any>, any>) => void;
        onPartsChange?: (parts: MessagePart[]) => void;
        onPartEvent?: (event: PartsTrackerEvent) => void;
        maxIterations?: number; // 新增：最大循环次数
    }): Promise<string> {
        // 合并外部传入的tools和toolManager中的tools
        const managerTools = this.toolManager.getAllTools();
        const uniqueTools = this.mergeTools([...params.tools, ...managerTools]);
        const paramsWithMergedTools = {
            ...params,
            tools: uniqueTools
        };

        // 循环控制逻辑
        const currentInput = params.input;
        let iterations = 0;
        const maxIterations = params.maxIterations || 10; // 默认最多10次循环
        let fullResponse = '';
        
        // 记录处理开始时间
        const startTime = Date.now();
        
        this.logger.info(`处理流式输入，合并了 ${params.tools.length} 个外部工具和 ${managerTools.length} 个系统工具，实际使用 ${uniqueTools.length} 个唯一工具`);
        
        // 创建一个共享的 PartsTracker 实例，所有迭代都使用它
        const sharedPartsTracker = new PartsTracker();
        
        // 注册 PartsTracker 的订阅
        if (params.onPartsChange) {
            sharedPartsTracker.subscribeParts().subscribe(params.onPartsChange);
        }
        if (params.onPartEvent) {
            sharedPartsTracker.subscribeEvents().subscribe(params.onPartEvent);
        }
        
        try {
            while (iterations < maxIterations) {
                this.logger.debug(`开始处理第 ${iterations + 1}/${maxIterations} 轮对话`, {
                    iteration: iterations + 1,
                    input: iterations === 0 ? currentInput.substring(0, 100) + (currentInput.length > 100 ? '...' : '') : '(基于工具结果自动继续)',
                    timestamp: new Date().toISOString()
                });
                
                // 处理单轮对话，传入共享的 PartsTracker
                const result = await this.processSingleIteration({
                    ...paramsWithMergedTools,
                    input: iterations === 0 ? currentInput : '', // 后续迭代不需要输入
                    iterationIndex: iterations,
                    continueFromToolResults: iterations > 0, // 标记是否是基于工具结果继续
                    sharedPartsTracker // 传入共享的 PartsTracker
                });
                
                // 累加响应
                if (iterations > 0) {
                    fullResponse += '\n\n' + result.response;
                } else {
                    fullResponse = result.response;
                }
                
                // 判断是否需要继续循环
                if (!result.requiresFollowUp) {
                    this.logger.debug('对话完成，不需要继续循环', {
                        iterations: iterations + 1,
                        totalTime: Date.now() - startTime
                    });
                    break;
                }
                
                // 后续迭代不需要准备下一轮输入，直接基于对话历史继续
                iterations++;
            }
            
            // 如果达到最大循环次数但仍需继续
            if (iterations >= maxIterations && iterations > 0) {
                this.logger.warn(`达到最大循环次数 ${maxIterations}，强制结束对话`);
                
                // 可以选择添加一条系统消息说明达到了最大迭代次数
                this.conversation.addMessages({
                    role: 'system',
                    content: `注意：该对话已达到最大迭代次数(${maxIterations})限制，可能未完全处理完所有工具调用结果。`
                });
            }
            
            // 完成所有处理后，调用 complete
            sharedPartsTracker.complete();
            
            return fullResponse;
        } catch (error) {
            const errorDuration = Date.now() - startTime;
            this.logger.error('处理流式输入失败', {
                error,
                duration: errorDuration,
                iterations,
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    /**
     * 合并工具，确保名称唯一性
     * 当有重复工具时，保留第一个出现的
     */
    private mergeTools(tools: Tool[]): Tool[] {
        const uniqueTools = new Map<string, Tool>();
        
        for (const tool of tools) {
            if (!uniqueTools.has(tool.name)) {
                uniqueTools.set(tool.name, tool);
            }
        }
        
        return Array.from(uniqueTools.values());
    }

    /**
     * 处理单轮对话
     * @private
     */
    private async processSingleIteration(params: {
        input: string;
        tools: Tool[];
        onChunk?: (chunk: string) => void;
        onToolCall?: (toolCall: ToolCall) => void;
        onToolResult?: (toolResult: ToolResult<string, Record<string, any>, any>) => void;
        onPartsChange?: (parts: MessagePart[]) => void;
        onPartEvent?: (event: PartsTrackerEvent) => void;
        iterationIndex: number;
        continueFromToolResults?: boolean; // 标记是否从工具结果继续
        sharedPartsTracker?: PartsTracker; // 新增：共享的 PartsTracker
    }): Promise<{
        response: string;
        requiresFollowUp: boolean;
        nextPrompt?: string;
        lastToolResult?: ToolResult<string, Record<string, any>, any>;
    }> {
        const { 
            input, 
            tools, 
            onChunk, 
            onToolCall, 
            onToolResult, 
            onPartsChange, 
            onPartEvent, 
            iterationIndex, 
            continueFromToolResults,
            sharedPartsTracker 
        } = params;
        const startTime = Date.now();
        let requiresFollowUp = false;
        let nextPrompt: string | undefined;
        let lastToolResult: ToolResult<string, Record<string, any>, any> | undefined;
        
        console.log('[AISystem] [processSingleIteration] [input]:', input, 'tools:', tools, 'iteration:', iterationIndex, 'continueFromToolResults:', continueFromToolResults);
        
        try {
            // 记录输入和工具信息
            this.logger.debug('开始处理带工具的流式输入', {
                timestamp: new Date().toISOString(),
                iteration: iterationIndex,
                input: input || '(基于工具结果自动继续)',
                continueFromToolResults: !!continueFromToolResults,
                availableTools: tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                })),
            });

            const messages = this.conversation.getHistory();
            
            // 对于后续迭代，添加一条系统消息引导AI处理
            if (continueFromToolResults) {
                messages.push({
                    role: 'system',
                    content: '请根据上述工具调用的结果继续处理，可以使用更多工具或者给出最终回答。'
                });
            }

            // 重置工具调用处理器
            this.toolCallProcessor.reset();
            
            // 使用共享的 PartsTracker 或创建新的
            const partsTracker = sharedPartsTracker || new PartsTracker();
            
            // 只有在没有使用共享 PartsTracker 的情况下才注册新的订阅
            if (!sharedPartsTracker) {
                if (onPartsChange) {
                    partsTracker.subscribeParts().subscribe(onPartsChange);
                }
                if (onPartEvent) {
                    partsTracker.subscribeEvents().subscribe(onPartEvent);
                }
            }
            
            // 创建 onAddChunk 回调函数，将其传递给模型
            const handleAddChunk = (chunk: MessageChunk) => {
                console.log('[AISystem] [processSingleIteration] [handleAddChunk]:', chunk);
                partsTracker.addChunk(chunk);
            };

            // 构建请求消息数组
            let requestMessages = messages;
            if (input && !continueFromToolResults) {
                // 首轮迭代: 添加用户输入
                requestMessages = [...messages, { role: 'user', content: input }];
                
                // 同时将用户输入添加到对话历史中
                if (iterationIndex === 0) {
                    this.conversation.addMessages({
                        role: 'user',
                        content: input
                    });
                    
                    this.logger.debug('添加用户消息到对话历史', {
                        contentLength: input.length
                    });
                }
            }
            
            // 生成AI响应
            const response = await this.model.generateStreamWithTools({
                messages: requestMessages,
                tools,
                onPartsChange,
                onPartEvent,
                onAddChunk: handleAddChunk
            });

            let fullResponse = '';
            let chunkCount = 0;
            let toolCallCount = 0;

            for await (const chunk of response) {
                chunkCount++;
                console.log('[BaseAISystem] [processSingleIteration] [chunk]:', chunk);
                
                // 记录每个chunk的原始内容和处理时间
                this.logger.debug('收到OpenAI流式响应chunk', {
                    chunkNumber: chunkCount,
                    timestamp: new Date().toISOString(),
                    processingTime: Date.now() - startTime,
                    chunk: JSON.stringify(chunk),
                });

                if (chunk.type === 'text') {
                    fullResponse += chunk.content as string;
                    onChunk?.(chunk.content as string);
                } else if (chunk.type === 'tool_call') {
                    const toolCall = chunk.content as ToolCall;
                    toolCallCount++;

                    onToolCall?.(toolCall);
                    
                    // 执行工具调用
                    const toolResult = await this.executeToolCall(toolCall, tools);
                    
                    // 触发工具结果回调
                    onToolResult?.(toolResult);

                    this.logger.debug("工具调用结果", {
                        toolResult
                    })
                    
                    // 添加工具结果到PartsTracker
                    partsTracker.addChunk({ type: 'tool_result', toolResult });
                    
                    // 记录最后一个工具结果，用于决定是否需要继续对话
                    lastToolResult = toolResult;
                    
                    // 检查是否需要继续对话
                    if (this.shouldContinueProcessing(toolResult)) {
                        requiresFollowUp = true;
                    }
                } else if (chunk.type === 'error') {
                    this.logger.error('流式处理错误', {
                        error: chunk.content,
                        timestamp: new Date().toISOString(),
                    });
                }
            }
            
            // 只有在没有使用共享 PartsTracker 的情况下才调用 complete
            if (!sharedPartsTracker) {
                partsTracker.complete();
            }

            // 记录完整响应和处理统计
            const totalDuration = Date.now() - startTime;
            this.logger.debug('单轮流式处理完成', {
                iteration: iterationIndex,
                fullResponse,
                requiresFollowUp,
                statistics: {
                    totalDuration,
                    chunkCount,
                    toolCallCount,
                    averageChunkTime: chunkCount > 0 ? totalDuration / chunkCount : 0,
                    timestamp: new Date().toISOString(),
                },
            });

            // 将当前迭代的内容存储到对话历史中
            // 收集当前迭代生成的消息部分
            // let assistantMessage = '';
            // const toolCalls: any[] = [];
            // const toolResults: Map<string, any> = new Map();
            
            // // 处理生成的部分
            // partsTracker.getParts().forEach(part => {
            //     if (part.type === 'text') {
            //         assistantMessage += part.text;
            //     } else if (part.type === 'tool_call') {
            //         toolCalls.push({
            //             id: part.toolCall.id,
            //             type: 'function',
            //             function: {
            //                 name: part.toolCall.function.name,
            //                 arguments: part.toolCall.function.arguments
            //             }
            //         });
            //     } else if (part.type === 'tool_result') {
            //         toolResults.set(part.toolResult.toolCallId, part.toolResult.result);
            //     }
            // });
            
            // // 添加助手消息（文本或工具调用）
            // if (assistantMessage || toolCalls.length > 0) {
            //     this.conversation.addMessage({
            //         role: 'assistant',
            //         content: assistantMessage,
            //         ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {})
            //     });
                
            //     this.logger.debug('添加助手消息到对话历史', {
            //         hasText: !!assistantMessage,
            //         textLength: assistantMessage.length,
            //         toolCallsCount: toolCalls.length
            //     });
            // }
            
            // // 添加工具结果消息
            // toolResults.forEach((result, toolCallId) => {
            //     const content = typeof result === 'string' ? result : JSON.stringify(result);
            //     this.conversation.addMessage({
            //         role: 'tool',
            //         content,
            //         tool_call_id: toolCallId
            //     });
                
            //     this.logger.debug('添加工具结果消息到对话历史', {
            //         toolCallId,
            //         contentLength: content.length
            //     });
            // });


            this.conversation.addMessages(...partsTracker.getConversationMessages());
            return {
                response: fullResponse,
                requiresFollowUp,
                nextPrompt,
                lastToolResult
            };
        } catch (error) {
            const errorDuration = Date.now() - startTime;
            this.logger.error('处理单轮流式输入失败', {
                error,
                iteration: iterationIndex,
                duration: errorDuration,
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    /**
     * 执行工具调用
     * @private
     */
    private async executeToolCall(
        toolCall: ToolCall, 
        tools: Tool[]
    ): Promise<ToolResult<string, Record<string, any>, any>> {
        const toolName = toolCall.function.name;
        const tool = tools.find((t) => t.name === toolName);
        
        this.logger.debug('开始工具调用', {
            toolName,
            toolCallId: toolCall.id,
            arguments: toolCall.function.arguments.substring(0, 100) + 
                (toolCall.function.arguments.length > 100 ? '...' : ''),
            timestamp: new Date().toISOString(),
        });
        
        if (!tool) {
            return {
                toolCallId: toolCall.id,
                toolName,
                args: this.safeParseJson(toolCall.function.arguments),
                result: `未找到工具: ${toolName}`,
            };
        }
        
        const toolStartTime = Date.now();
        try {
            const result = await tool.handler(this.safeParseJson(toolCall.function.arguments));
            const toolResult: ToolResult<string, Record<string, any>, any> = {
                toolCallId: toolCall.id,
                toolName,
                args: this.safeParseJson(toolCall.function.arguments),
                result,
            };
            
            this.logger.debug('工具执行结果', {
                toolResult,
                executionTime: Date.now() - toolStartTime,
                timestamp: new Date().toISOString(),
            });
            
            return toolResult;
        } catch (error) {
            const toolResult: ToolResult<string, Record<string, any>, any> = {
                toolCallId: toolCall.id,
                toolName,
                args: this.safeParseJson(toolCall.function.arguments),
                result: error instanceof Error ? error.message : 'Unknown error',
            };
            
            this.logger.error('工具执行失败', {
                error,
                toolResult,
                executionTime: Date.now() - toolStartTime,
                timestamp: new Date().toISOString(),
            });
            
            return toolResult;
        }
    }
    
    /**
     * 判断是否需要继续处理
     * @private
     */
    private shouldContinueProcessing(
        toolResult: ToolResult<string, Record<string, any>, any>
    ): boolean {
        // 暂时直接返回true，所有工具调用都继续处理
        this.logger.debug('所有工具调用都继续处理', {
            toolName: toolResult.toolName
        });
        return true;
    }
    
    /**
     * 构建下一轮提示
     * @private
     */
    private buildNextPrompt(
        toolResult: ToolResult<string, Record<string, any>, any>
    ): string {
        // 如果工具结果中已经提供了下一轮提示
        if (typeof toolResult.result === 'object' && 
            toolResult.result !== null && 
            'nextPrompt' in toolResult.result &&
            typeof toolResult.result.nextPrompt === 'string') {
            return toolResult.result.nextPrompt;
        }
        
        // 根据不同工具类型生成不同的提示
        return this.buildDefaultNextPrompt(toolResult);
    }
    
    /**
     * 构建默认的下一轮提示
     * @private
     */
    private buildDefaultNextPrompt(
        toolResult?: ToolResult<string, Record<string, any>, any>
    ): string {
        if (!toolResult) {
            return '请继续处理之前的任务';
        }
        
        // 基于工具结果构建提示
        const resultPreview = typeof toolResult.result === 'string' 
            ? toolResult.result.substring(0, 100) + (toolResult.result.length > 100 ? '...' : '')
            : JSON.stringify(toolResult.result).substring(0, 100) + '...';
            
        return `你使用了工具 "${toolResult.toolName}" 并获得了以下结果: ${resultPreview}\n\n请基于这个结果继续完成用户的请求`;
    }
    
    /**
     * 安全解析JSON
     * @private
     */
    private safeParseJson(jsonString: string): Record<string, any> {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            this.logger.warn('解析JSON失败', { jsonString: jsonString.substring(0, 100) });
            return {};
        }
    }
}
