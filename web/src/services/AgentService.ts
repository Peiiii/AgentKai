// 消息接口
// 导入浏览器平台服务
import browserPlatform from '@agentkai/browser';
import { Goal, GoalStatus, Message } from '@agentkai/core';
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

    private constructor() {
        // 私有构造函数，使用单例模式
        this.messageStorage = MessageStorage.getInstance();
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

            this.initialized = true;
            console.log('AgentService initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AgentService:', error);
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
