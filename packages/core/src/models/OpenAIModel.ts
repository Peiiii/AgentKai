import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { AIModel, Context, Decision } from '../types';
import { ModelConfig } from '../types/config';
import { Logger } from '../utils/logger';

export class OpenAIModel implements AIModel {
    private client: OpenAI;
    private config: ModelConfig;
    private logger: Logger;

    constructor(config: ModelConfig) {
        this.config = config;
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.apiBaseUrl,
        });
        this.logger = new Logger('OpenAIModel');
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

    async generateResponse(
        messages: string[]
    ): Promise<{
        response: string;
        tokens: { prompt: number; completion: number; total: number };
    }> {
        try {
            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages: messages.map((content) => ({ role: 'user', content })),
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
            });

            const promptTokens = response.usage?.prompt_tokens || 0;
            const completionTokens = response.usage?.completion_tokens || 0;

            return {
                response: response.choices[0].message?.content || '',
                tokens: {
                    prompt: promptTokens,
                    completion: completionTokens,
                    total: promptTokens + completionTokens,
                },
            };
        } catch (error) {
            this.logger.error('生成响应失败:', error);
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
}
