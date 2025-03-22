import { OpenAIModel } from '../models/OpenAIModel';
import { ModelConfig } from '../types';

const mockCreate = jest.fn();
const mockEmbeddingsCreate = jest.fn();

jest.mock('openai', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: mockCreate
                }
            },
            embeddings: {
                create: mockEmbeddingsCreate
            }
        }))
    };
});

describe('OpenAIModel', () => {
    let model: OpenAIModel;
    const config: ModelConfig = {
        apiKey: 'test-api-key',
        modelName: 'qwen-max-latest',
        maxTokens: 2000,
        temperature: 0.7,
        model: 'qwen-max-latest',
        apiBaseUrl: 'https://api.example.com',
        embeddingModel: 'text-embedding-v3',
        embeddingBaseUrl: 'https://api.example.com/embeddings'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        model = new OpenAIModel(config);
    });

    describe('generateResponse', () => {
        it('should generate chat responses', async () => {
            const messages = [
                '系统：你是一个AI助手',
                '用户：你好'
            ];

            const mockResponse = {
                choices: [{
                    message: {
                        content: '你好！我是AI助手。'
                    }
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 5
                }
            };

            mockCreate.mockResolvedValue(mockResponse);

            const response = await model.generateResponse(messages);
            expect(response.response).toBe('你好！我是AI助手。');
            expect(response.tokens).toEqual({ prompt: 10, completion: 5 });
        });

        it('should handle empty messages', async () => {
            const messages: string[] = [];

            const mockResponse = {
                choices: [{
                    message: {
                        content: '我能帮你什么？'
                    }
                }],
                usage: {
                    prompt_tokens: 5,
                    completion_tokens: 3
                }
            };

            mockCreate.mockResolvedValue(mockResponse);

            const response = await model.generateResponse(messages);
            expect(response.response).toBe('我能帮你什么？');
            expect(response.tokens).toEqual({ prompt: 5, completion: 3 });
        });
    });

    describe('generateEmbedding', () => {
        it('should generate text embeddings', async () => {
            const text = '测试文本';
            const mockEmbedding = new Array(1024).fill(0.1);

            const mockResponse = {
                data: [{
                    embedding: mockEmbedding
                }]
            };

            mockEmbeddingsCreate.mockResolvedValue(mockResponse);

            const embedding = await model.generateEmbedding(text);
            
            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.length).toBe(1024);
            expect(embedding.every(n => typeof n === 'number')).toBe(true);
        });

        it('should reject empty text', async () => {
            const text = '';
            
            await expect(model.generateEmbedding(text)).rejects.toThrow('文本内容不能为空');
        });
    });

    describe('error handling', () => {
        it('should handle chat API errors', async () => {
            const messages = ['用户：测试'];
            
            mockCreate.mockRejectedValue(new Error('API Error'));

            await expect(model.generateResponse(messages)).rejects.toThrow('API Error');
        });

        it('should handle embedding API errors', async () => {
            mockEmbeddingsCreate.mockRejectedValue(new Error('API Error'));

            await expect(model.generateEmbedding('测试')).rejects.toThrow('API Error');
        });
    });
}); 