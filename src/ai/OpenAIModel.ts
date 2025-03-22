import OpenAI from 'openai';
import { AIModel, Context, Vector, Decision } from '../types';

interface OpenAIConfig {
    apiKey: string;
    baseURL?: string;
    model?: string;
    embeddingModel?: string;
    embeddingBaseURL?: string;
}

export class OpenAIModel implements AIModel {
    private client: OpenAI;
    private model: string;
    private embeddingModel: string;
    private embeddingClient: OpenAI;

    constructor(config: OpenAIConfig) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL || 'https://api.openai.com/v1'
        });
        this.model = config.model || 'gpt-3.5-turbo';
        this.embeddingModel = config.embeddingModel || 'text-embedding-ada-002';
        
        // 为嵌入模型创建单独的客户端
        this.embeddingClient = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.embeddingBaseURL || config.baseURL || 'https://api.openai.com/v1'
        });
    }

    async generateEmbedding(text: string): Promise<Vector> {
        const response = await this.embeddingClient.embeddings.create({
            model: this.embeddingModel,
            input: text
        });
        return response.data[0].embedding;
    }

    async generateText(prompt: string): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: "user", content: prompt }]
        });
        return response.choices[0].message.content || '';
    }

    async generateDecision(context: Context): Promise<Decision> {
        const prompt = `基于以下上下文做出决策：
当前记忆: ${context.memories.map(m => m.content).join('\n')}
当前目标: ${context.tools.map(t => t.name).join(', ')}
环境信息: ${JSON.stringify(context.environment)}

请分析上下文并做出合适的决策。`;

        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: "user", content: prompt }]
        });

        const content = response.choices[0].message.content || '';
        return {
            id: '',
            action: content,
            confidence: 0.8,
            reasoning: content,
            timestamp: Date.now(),
            context: {
                memories: context.memories.map(m => m.id),
                tools: context.tools.map(t => t.id),
                goals: []
            }
        };
    }

    async generateResponse(messages: string[]): Promise<{ response: string; tokens: { prompt: number; completion: number } }> {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: messages.map(msg => ({ role: "user", content: msg }))
        });
        return {
            response: response.choices[0].message.content || '',
            tokens: {
                prompt: response.usage?.prompt_tokens || 0,
                completion: response.usage?.completion_tokens || 0
            }
        };
    }
} 