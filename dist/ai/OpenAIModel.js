"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIModel = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIModel {
    constructor(config) {
        this.client = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: config.baseURL || 'https://api.openai.com/v1'
        });
        this.model = config.model || 'gpt-3.5-turbo';
        this.embeddingModel = config.embeddingModel || 'text-embedding-ada-002';
        // 为嵌入模型创建单独的客户端
        this.embeddingClient = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: config.embeddingBaseURL || config.baseURL || 'https://api.openai.com/v1'
        });
    }
    async generateEmbedding(text) {
        const response = await this.embeddingClient.embeddings.create({
            model: this.embeddingModel,
            input: text
        });
        return response.data[0].embedding;
    }
    async generateText(prompt) {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: "user", content: prompt }]
        });
        return response.choices[0].message.content || '';
    }
    async generateDecision(context) {
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
    async generateResponse(messages) {
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
exports.OpenAIModel = OpenAIModel;
