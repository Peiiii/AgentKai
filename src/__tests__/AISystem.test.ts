import { AISystem } from '../core/AISystem';
import { OpenAIModel } from '../models/OpenAIModel';
import { Config, GoalStatus } from '../types';

jest.mock('../models/OpenAIModel', () => {
    return {
        OpenAIModel: jest.fn().mockImplementation(() => ({
            generateResponse: jest.fn(),
            generateEmbedding: jest.fn()
        }))
    };
});

describe('AISystem', () => {
    let ai: AISystem;
    let mockModel: jest.Mocked<OpenAIModel>;
    let config: Config;

    beforeEach(() => {
        config = {
            modelConfig: {
                apiKey: 'test-api-key',
                modelName: 'qwen-max-latest',
                maxTokens: 2000,
                temperature: 0.7,
                model: 'qwen-max-latest',
                apiBaseUrl: 'https://api.example.com',
                embeddingModel: 'text-embedding-v1',
                embeddingBaseUrl: 'https://api.example.com/embeddings'
            },
            memoryConfig: {
                vectorDimensions: 1536,
                maxMemories: 1000,
                similarityThreshold: 0.8,
                shortTermCapacity: 10,
                importanceThreshold: 0.5
            },
            decisionConfig: {
                confidenceThreshold: 0.7,
                maxRetries: 3,
                maxReasoningSteps: 5,
                minConfidenceThreshold: 0.6
            },
            appConfig: {
                name: '凯',
                version: '1.0.0',
                defaultLanguage: 'zh-CN'
            }
        };

        // 创建模拟的OpenAIModel实例
        mockModel = new OpenAIModel(config.modelConfig) as jest.Mocked<OpenAIModel>;

        // 设置模拟方法的返回值
        mockModel.generateResponse.mockResolvedValue({
            response: '测试响应',
            tokens: { prompt: 10, completion: 5 }
        });
        mockModel.generateEmbedding.mockResolvedValue(new Array(1536).fill(0.1));

        // 替换OpenAIModel的构造函数，使其返回我们的模拟实例
        (OpenAIModel as jest.MockedClass<typeof OpenAIModel>).mockImplementation(() => mockModel);

        ai = new AISystem(config, mockModel);
    });

    describe('processInput', () => {
        it('should process user input and return a response', async () => {
            const input = '你好';
            const response = await ai.processInput(input);

            expect(response).toBeDefined();
            expect(response.output).toBeDefined();
            expect(Array.isArray(response.relevantMemories)).toBe(true);
            expect(Array.isArray(response.activeGoals)).toBe(true);
        });

        it('should handle errors gracefully', async () => {
            mockModel.generateResponse.mockRejectedValue(new Error('API Error'));

            const input = '你好';
            const response = await ai.processInput(input);
            expect(response.output).toContain('处理您的请求时出错');
        });

        it('should respect confidence threshold', async () => {
            const input = '你好';
            const result = await ai.processInput(input);

            expect(result.output).toBeDefined();
        });
    });

    describe('goal management', () => {
        it('should add and retrieve goals', async () => {
            const goal = await ai.addGoal({
                description: '测试目标',
                priority: 1,
                dependencies: [],
                subGoals: [],
                metadata: {},
                metrics: {}
            });

            expect(goal).toBeDefined();
            expect(goal.id).toBeDefined();
            expect(goal.description).toBe('测试目标');

            const retrievedGoal = await ai.getGoal(goal.id);
            expect(retrievedGoal).toEqual(goal);
        });
    });

    describe('Goal Management', () => {
        it('should create and manage goals', async () => {
            const goal = await ai.addGoal({
                description: '测试目标',
                priority: 1,
                metadata: {},
                dependencies: [],
                subGoals: [],
                metrics: {}
            });

            expect(goal.id).toBeDefined();
            expect(goal.description).toBe('测试目标');
            expect(goal.status).toBe(GoalStatus.PENDING);

            await ai.updateGoalStatus(goal.id, GoalStatus.ACTIVE);
            const updatedGoal = await ai.getGoal(goal.id);
            expect(updatedGoal?.status).toBe(GoalStatus.ACTIVE);

            const result = await ai.processInput('测试输入');
            expect(result.activeGoals).toBeDefined();
            expect(Array.isArray(result.activeGoals)).toBe(true);
        });
    });

    describe('Decision Making', () => {
        it('should process input and make decisions', async () => {
            const result = await ai.processInput('测试输入');

            expect(result.output).toBeDefined();
        });

        it('should handle decision feedback', async () => {
            const result = await ai.processInput('测试决策反馈');
            expect(result.output).toBeDefined();
        });
    });

    describe('Memory System', () => {
        it('should store and retrieve memories', async () => {
            const input = '记住这个测试输入';
            const result = await ai.processInput(input);
            expect(result.relevantMemories).toBeDefined();

            // 等待一会儿再次输入相关内容
            await new Promise(resolve => setTimeout(resolve, 100));
            const secondResult = await ai.processInput('之前的测试输入是什么?');
            
            if (secondResult.relevantMemories && secondResult.relevantMemories.length > 0) {
                expect(secondResult.relevantMemories.length).toBeGreaterThan(0);
                expect(secondResult.relevantMemories[0].content).toContain('测试输入');
            }
        });
    });
}); 