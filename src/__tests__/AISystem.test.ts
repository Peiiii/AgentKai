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
                temperature: 0.7
            },
            memoryConfig: {
                vectorDimensions: 1536,
                maxMemories: 1000,
                similarityThreshold: 0.8
            },
            decisionConfig: {
                confidenceThreshold: 0.7,
                maxRetries: 3
            }
        };

        // 创建模拟的OpenAIModel实例
        mockModel = new OpenAIModel(config.modelConfig) as jest.Mocked<OpenAIModel>;

        // 设置模拟方法的返回值
        mockModel.generateResponse.mockResolvedValue(JSON.stringify({
            output: '测试响应',
            confidence: 0.8,
            reasoning: ['测试推理']
        }));
        mockModel.generateEmbedding.mockResolvedValue(new Array(1536).fill(0.1));

        // 替换OpenAIModel的构造函数，使其返回我们的模拟实例
        (OpenAIModel as jest.MockedClass<typeof OpenAIModel>).mockImplementation(() => mockModel);

        ai = new AISystem(config);
    });

    describe('processInput', () => {
        it('should process user input and return a response', async () => {
            const input = '你好';
            const response = await ai.processInput(input);

            expect(response).toBeDefined();
            expect(response.output).toBeDefined();
            expect(response.confidence).toBeGreaterThan(0);
            expect(Array.isArray(response.reasoning)).toBe(true);
            expect(Array.isArray(response.relevantMemories)).toBe(true);
            expect(Array.isArray(response.activeGoals)).toBe(true);
        });

        it('should handle errors gracefully', async () => {
            mockModel.generateResponse.mockRejectedValue(new Error('API Error'));

            const input = '你好';
            await expect(ai.processInput(input)).rejects.toThrow('无法生成足够可信的决策');
        });

        it('should respect confidence threshold', async () => {
            const input = '你好';
            const result = await ai.processInput(input);

            expect(result.output).toBeDefined();
            expect(result.confidence).toBeGreaterThanOrEqual(config.decisionConfig.confidenceThreshold);
            expect(result.reasoning).toBeInstanceOf(Array);
            expect(result.timestamp).toBeDefined();
        });
    });

    describe('goal management', () => {
        it('should add and retrieve goals', async () => {
            const goal = await ai.addGoal({
                description: '测试目标',
                priority: 1,
                dependencies: [],
                subGoals: [],
                metadata: {}
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
                subGoals: []
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
            expect(result.confidence).toBeGreaterThanOrEqual(config.decisionConfig.confidenceThreshold);
            expect(result.reasoning).toBeInstanceOf(Array);
            expect(result.timestamp).toBeDefined();
        });

        it('should handle decision feedback', async () => {
            const result = await ai.processInput('测试决策反馈');
            expect(result.output).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0);
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
            expect(secondResult.relevantMemories.length).toBeGreaterThan(0);
            expect(secondResult.relevantMemories[0].text).toContain('测试输入');
        });
    });
}); 