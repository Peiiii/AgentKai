import { AISystem, platform, OpenAIModel, Memory } from '@agentkai/browser';

/**
 * 数据访问层 - 封装对AISystem的直接访问
 */
export class AgentAPI {
    private static instance: AgentAPI | null = null;
    private aiSystem: AISystem;
    private initialized = false;

    private constructor() {
        // 从环境变量读取配置
        const config = {
            modelConfig: {
                model: import.meta.env.VITE_MODEL_NAME || 'gpt-4o',
                apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
                temperature: Number(import.meta.env.VITE_TEMPERATURE || '0.7'),
                maxTokens: Number(import.meta.env.VITE_MAX_TOKENS || '2048'),
                modelName: import.meta.env.VITE_MODEL_NAME || 'gpt-4o',
                apiBaseUrl: import.meta.env.VITE_OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
                embeddingModel: import.meta.env.VITE_EMBEDDING_MODEL || 'text-embedding-v3',
                embeddingBaseUrl: import.meta.env.VITE_EMBEDDING_BASE_URL || 'https://api.openai.com/v1',
                embeddingDimensions: Number(import.meta.env.VITE_EMBEDDING_DIMENSIONS || '1024'),
            },
            memoryConfig: {
                vectorDimensions: Number(import.meta.env.VITE_VECTOR_DIMENSIONS || '1024'),
                maxMemories: Number(import.meta.env.VITE_MAX_MEMORIES || '1000'),
                similarityThreshold: Number(import.meta.env.VITE_SIMILARITY_THRESHOLD || '0.7'),
                shortTermCapacity: Number(import.meta.env.VITE_SHORT_TERM_CAPACITY || '10'),
                importanceThreshold: Number(import.meta.env.VITE_IMPORTANCE_THRESHOLD || '0.5'),
            },
            appConfig: {
                name: import.meta.env.VITE_APP_NAME || '凯',
                version: import.meta.env.VITE_APP_VERSION || '1.0.0',
                defaultLanguage: import.meta.env.VITE_DEFAULT_LANGUAGE || 'zh-CN',
                dataPath: import.meta.env.VITE_DATA_PATH || '/data',
            },
        };

        // 创建模型实例
        const model = new OpenAIModel(config.modelConfig);
        
        // 创建AISystem实例，带配置和模型
        this.aiSystem = new AISystem(config, model, []);
    }

    public static getInstance(): AgentAPI {
        if (!AgentAPI.instance) {
            AgentAPI.instance = new AgentAPI();
        }
        return AgentAPI.instance;
    }

    /**
     * 初始化AI系统
     */
    public async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // 确保浏览器平台已初始化
            await platform.fs.mkdir('/', { recursive: true });

            // 初始化AI系统
            await this.aiSystem.initialize();

            this.initialized = true;
            console.log('AgentAPI initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AgentAPI:', error);
            throw error;
        }
    }

    /**
     * 处理用户消息（流式输出）
     * @param content 消息内容
     * @param onChunk 处理每个数据块的回调函数
     * @returns 处理结果
     */
    public async processMessageStream(
        content: string,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        await this.ensureInitialized();
        
        try {
            // 使用流式处理
            const stream = await this.aiSystem.processInputStream(content);
            
            // 处理流式响应
            for await (const chunk of stream) {
                if (chunk.output) {
                    onChunk(chunk.output);
                }
            }
        } catch (error) {
            console.error('Stream processing error:', error);
            throw error;
        }
    }

    /**
     * 处理用户消息（兼容旧版本）
     * @param content 消息内容
     * @returns 处理结果
     */
    public async processMessage(content: string): Promise<{ content: string }> {
        await this.ensureInitialized();
        const response = await this.aiSystem.processInput(content);
        return { content: response.output || '未获取到回复' };
    }

    /**
     * 获取记忆列表
     */
    public async getMemories(): Promise<Memory[]> {
        await this.ensureInitialized();
        return this.aiSystem.getAllMemories();
    }

    /**
     * 获取对话列表
     */
    public async getConversations(): Promise<Record<string, unknown>[]> {
        await this.ensureInitialized();
        // 通过记忆系统筛选类型为对话的记忆
        const memories = await this.aiSystem.getAllMemories();
        // 转换为对话格式
        return memories
            .filter(memory => memory.type === 'conversation')
            .map(memory => ({
                id: memory.id,
                content: memory.content,
                timestamp: memory.createdAt,
                metadata: memory.metadata
            }));
    }

    /**
     * 获取目标列表
     */
    public async getGoals(): Promise<{ id: string; description: string; progress: number }[]> {
        await this.ensureInitialized();
        
        try {
            // 从记忆中提取目标相关信息
            const memories = await this.aiSystem.getAllMemories();
            
            // 过滤并转换记忆为目标格式
            return memories
                // 使用字符串比较而不是严格类型比较，以适应不同的MemoryType实现
                .filter(memory => 
                    typeof memory.type === 'string' && 
                    (memory.type.includes('goal') || memory.type.includes('plan'))
                )
                .map(memory => ({
                    id: memory.id,
                    description: memory.content,
                    progress: Number(memory.metadata?.progress || 0)
                }));
        } catch (error) {
            console.error('Failed to get goals:', error);
            return [];
        }
    }

    /**
     * 确保AI系统已初始化
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
    }
}
