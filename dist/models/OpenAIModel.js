"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIModel = void 0;
const openai_1 = __importDefault(require("openai"));
const uuid_1 = require("uuid");
class OpenAIModel {
    constructor(config) {
        this.config = config;
        this.client = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: config.apiBaseUrl,
        });
    }
    async generateEmbedding(text) {
        try {
            if (!text || text.trim() === '') {
                throw new Error('文本内容不能为空');
            }
            console.log(`[OpenAIModel] 开始生成向量，文本长度: ${text.length}`);
            const response = await this.client.embeddings.create({
                model: this.config.embeddingModel || 'text-embedding-ada-002',
                input: text
            });
            return response.data[0].embedding;
        }
        catch (error) {
            console.error('[OpenAIModel] 生成嵌入向量失败:', error);
            throw error;
        }
    }
    async generateText(prompt) {
        try {
            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens
            });
            return response.choices[0].message?.content || '';
        }
        catch (error) {
            console.error('生成文本失败:', error);
            throw error;
        }
    }
    async generateResponse(messages) {
        try {
            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages: messages.map(content => ({ role: 'user', content })),
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens
            });
            return {
                response: response.choices[0].message?.content || '',
                tokens: {
                    prompt: response.usage?.prompt_tokens || 0,
                    completion: response.usage?.completion_tokens || 0
                }
            };
        }
        catch (error) {
            console.error('生成响应失败:', error);
            throw error;
        }
    }
    async generateDecision(context) {
        try {
            const prompt = this.buildDecisionPrompt(context);
            const response = await this.generateText(prompt);
            const parsed = JSON.parse(response);
            return {
                id: (0, uuid_1.v4)(),
                action: parsed.action || 'respond',
                confidence: parsed.confidence || 0.5,
                reasoning: parsed.reasoning || '基于输入生成的决策',
                timestamp: Date.now(),
                context: {
                    memories: context.memories.map(m => m.content),
                    tools: context.tools.map(t => t.name),
                    goals: []
                }
            };
        }
        catch (error) {
            console.error('解析决策失败:', error);
            return {
                id: (0, uuid_1.v4)(),
                action: 'error',
                confidence: 0.5,
                reasoning: '解析决策失败',
                timestamp: Date.now(),
                context: {
                    memories: [],
                    tools: [],
                    goals: []
                }
            };
        }
    }
    buildDecisionPrompt(context) {
        const memories = context.memories.map(m => m.content).join('\n');
        const tools = context.tools.map(t => t.name).join(', ');
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
exports.OpenAIModel = OpenAIModel;
