// 消息接口
export interface Message {
    id: string;
    content: string;
    isAgent: boolean;
    timestamp: Date;
}

// 导入浏览器平台服务
import browserPlatform from '@agentkai/browser';
import { Goal, GoalStatus, Memory, MemoryType } from '@agentkai/core';
import { MemoryStorage } from './MemoryStorage';
import { MessageStorage } from './MessageStorage';

/**
 * 代理服务 - 负责处理与AI代理的通信
 */
export class AgentService {
    private static instance: AgentService;
    private initialized = false;
    // 添加平台引用
    private browserPlatform = browserPlatform;
    // 添加消息存储
    private messageStorage: MessageStorage;
    // 添加记忆存储
    private memoryStorage: MemoryStorage;

    private constructor() {
        // 私有构造函数，使用单例模式
        this.messageStorage = MessageStorage.getInstance();
        this.memoryStorage = MemoryStorage.getInstance();
    }

    /**
     * 获取AgentService实例
     */
    public static getInstance(): AgentService {
        if (!AgentService.instance) {
            AgentService.instance = new AgentService();
        }
        return AgentService.instance;
    }

    /**
     * 初始化代理服务
     */
    public async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // 初始化浏览器平台
            console.log('Browser platform:', this.browserPlatform);

            // 确保文件系统已准备就绪
            if (!(await this.browserPlatform.fs.exists('/'))) {
                await this.browserPlatform.fs.mkdir('/', { recursive: true });
            }

            // 设置环境变量
            this.browserPlatform.env.set('AGENT_INITIALIZED', 'true');

            // 初始化消息存储
            await this.messageStorage.initialize();

            // 初始化记忆存储
            await this.memoryStorage.initialize();

            this.initialized = true;
            console.log('AgentService initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AgentService:', error);
            throw error;
        }
    }

    /**
     * 发送消息给AI并获取回复
     * @param content 用户消息内容
     */
    public async sendMessage(content: string): Promise<Message> {
        // 创建用户消息
        const userMessage: Message = {
            id: `user_${Date.now()}`,
            content,
            isAgent: false,
            timestamp: new Date(),
        };

        // 保存用户消息
        await this.messageStorage.saveMessage(userMessage);

        // 目前只是模拟AI响应，稍后会连接到实际的AgentKai AI系统
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 根据用户输入生成不同的回复
        let aiResponse = '';
        if (content.includes('你好') || content.includes('嗨') || content.includes('hi')) {
            aiResponse = '你好！有什么我可以帮助你的吗？';
        } else if (content.includes('?') || content.includes('？')) {
            aiResponse = `关于"${content}"的问题，我需要收集更多信息才能给出准确答案。请提供更多细节。`;
        } else if (content.toLowerCase().includes('react')) {
            aiResponse =
                'React是一个流行的JavaScript库，用于构建用户界面。你想了解React的哪方面知识呢？';
        } else if (content.includes('谢谢') || content.includes('感谢')) {
            aiResponse = '不客气！随时为你服务。';
        } else {
            aiResponse = `我收到了你的消息: "${content}"。我正在处理这个信息，有什么具体问题我可以帮助解答的吗？`;
        }

        // 创建AI回复
        const agentMessage: Message = {
            id: `agent_${Date.now()}`,
            content: aiResponse,
            isAgent: true,
            timestamp: new Date(),
        };

        // 保存AI回复
        await this.messageStorage.saveMessage(agentMessage);

        return agentMessage;
    }

    /**
     * 发送消息给AI并获取流式回复
     * @param content 用户消息内容
     * @param onChunk 处理每个数据块的回调函数
     */
    public async sendMessageStream(
        content: string,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        // 创建用户消息
        const userMessage: Message = {
            id: `user_${Date.now()}`,
            content,
            isAgent: false,
            timestamp: new Date(),
        };

        // 保存用户消息
        await this.messageStorage.saveMessage(userMessage);

        try {
            // 创建AI回复消息
            const agentMessage: Message = {
                id: `agent_${Date.now()}`,
                content: '',
                isAgent: true,
                timestamp: new Date(),
            };

            // 保存初始AI消息
            await this.messageStorage.saveMessage(agentMessage);

            // 使用流式处理
            const api = await import('../api/agent').then(m => m.AgentAPI.getInstance());
            await api.processMessageStream(content, async (chunk) => {
                // 更新消息内容
                agentMessage.content += chunk;
                // 保存更新后的消息
                await this.messageStorage.saveMessage(agentMessage);
                // 调用回调函数
                onChunk(chunk);
            });
        } catch (error) {
            console.error('Stream processing error:', error);
            throw error;
        }
    }

    /**
     * 获取消息历史
     * @returns 消息历史数组
     */
    public async getMessageHistory(): Promise<Message[]> {
        return this.messageStorage.getAllMessages();
    }

    /**
     * 获取记忆列表
     */
    public async getMemories(): Promise<Memory[]> {
        // 从记忆存储中获取记忆
        return this.memoryStorage.getAllMemories();
    }

    /**
     * 添加记忆
     * @param content 记忆内容
     * @param category 记忆分类
     * @param tags 记忆标签
     * @param importance 重要性
     */
    public async addMemory(content: string): Promise<Memory> {
        const memory: Memory = {
            id: `memory_${Date.now()}`,
            content,
            type: MemoryType.OBSERVATION,
            createdAt: new Date().getTime(),
            metadata: {},
        };

        return this.memoryStorage.saveMemory(memory);
    }

    /**
     * 获取目标列表
     */
    public async getGoals(): Promise<Goal[]> {
        // 模拟从存储中获取目标
        return [
            {
                id: '1',
                description: '学习React',
                progress: 0.7,
                priority: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: GoalStatus.ACTIVE,
                dependencies: [],
                subGoals: [],
                metadata: {},
                metrics: {},
            },
            {
                id: '2',
                description: '完成项目',
                progress: 0.4,
                priority: 2,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: GoalStatus.ACTIVE,
                dependencies: [],
                subGoals: [],
                metadata: {},
                metrics: {},
            },
        ];
    }
}
