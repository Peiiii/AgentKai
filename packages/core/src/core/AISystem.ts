import { GoalManager } from '../goals/GoalManager';
import { MemorySystem } from '../memory/MemorySystem';
import { EmbeddingProvider, OpenAIEmbeddingProvider } from '../memory/embedding';
import { ISearchProvider } from '../memory/embedding/ISearchProvider';
import { BaseConfigService } from '../services/config';
import { ToolService } from '../services/tools';
import { StorageProvider } from '../storage/StorageProvider';
import { AIModel, Goal, GoalStatus, Memory, MemoryType, SystemResponse } from '../types';
import { AgentKaiConfig } from '../types/config';
import { ModelError, wrapError } from '../utils/errors';
import { Logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performance';
import { ConversationManager } from './conversation/ConversationManager';
import { PluginManager } from './plugins/PluginManager';
import { PromptBuilder } from './prompts/PromptBuilder';
import { ResponseProcessor } from './response/ResponseProcessor';

// 定义插件接口
export interface Plugin {
    getTools(): any[];
    getName(): string;
}

/**
 * AISystem作为核心协调类，负责整合和管理各个子系统
 */
export class BaseAISystem {
    private memory: MemorySystem;
    private goals: GoalManager;
    private model: AIModel;
    private logger: Logger;
    private performance: PerformanceMonitor;
    private requestTimeoutMs: number = 30000; // 默认请求超时时间为30秒
    private config: AgentKaiConfig | null = null;

    // 新的组件
    private conversation: ConversationManager;
    private pluginManager: PluginManager;
    private responseProcessor: ResponseProcessor;
    private promptBuilder: PromptBuilder;

    private configService: BaseConfigService;

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

    constructor(config: AgentKaiConfig, model: AIModel, plugins: Plugin[] = []) {
        this.logger = new Logger('AISystem');
        this.performance = new PerformanceMonitor('AISystem');
        this.config = config;
        this.model = model;
        this.configService = this.createConfigService();

        // 初始化记忆系统
        this.memory = this.createMemorySystem();

        // 初始化目标系统
        this.goals = this.createGoalManager();

        // 初始化新组件
        this.conversation = new ConversationManager(10); // 保留最近10条消息
        this.pluginManager = new PluginManager(plugins);
        this.responseProcessor = new ResponseProcessor(this.logger);
        this.promptBuilder = new PromptBuilder(config);
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
            this.conversation.addMessage('user', input);

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
            this.conversation.addMessage('assistant', finalOutput);

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

    getToolService(): ToolService {
        return ToolService.getInstance();
    }
}
