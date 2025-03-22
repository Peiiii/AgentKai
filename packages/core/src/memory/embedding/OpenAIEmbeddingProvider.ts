import { EmbeddingProvider } from './EmbeddingProvider';
import { Logger } from '../../utils/logger';
import OpenAI from 'openai';

/**
 * OpenAI嵌入向量提供者
 * 使用OpenAI的API生成文本的嵌入向量
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
    private client: OpenAI;
    private model: string;
    private dimensions: number;
    private logger: Logger;

    /**
     * 创建OpenAI嵌入向量提供者
     * @param apiKey OpenAI API密钥
     * @param model 嵌入模型名称
     * @param baseURL API基础URL（对于阿里云DashScope需要设置）
     * @param dimensions 向量维度（根据模型不同而不同）
     */
    constructor(apiKey: string, model: string = 'text-embedding-ada-002', baseURL?: string, dimensions: number = 1024) {
        this.client = new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL
        });
        this.model = model;
        this.dimensions = dimensions; 
        this.logger = new Logger('OpenAIEmbeddingProvider');
        this.logger.info(`初始化OpenAI嵌入提供者，模型: ${model}, 维度: ${this.dimensions}`);
    }

    /**
     * 获取文本的嵌入向量
     * @param text 要嵌入的文本
     * @returns 向量表示
     */
    async getEmbedding(text: string): Promise<number[]> {
        try {
            if (!text || text.trim() === '') {
                throw new Error('文本内容不能为空');
            }

            this.logger.debug(`生成嵌入向量，文本长度: ${text.length}`);
            const response = await this.client.embeddings.create({
                model: this.model,
                input: text
            });

            const embedding = response.data[0].embedding;
            
            // 验证向量维度
            if (embedding.length !== this.dimensions) {
                this.logger.warn(`返回的向量维度(${embedding.length})与预期维度(${this.dimensions})不匹配`);
            }
            
            return embedding;
        } catch (error) {
            this.logger.error('生成嵌入向量失败:', error);
            throw error;
        }
    }

    /**
     * 获取向量维度
     * @returns 向量维度
     */
    getDimensions(): number {
        return this.dimensions;
    }

    /**
     * 获取提供者名称
     * @returns 提供者名称
     */
    getName(): string {
        return `OpenAIEmbedding:${this.model}`;
    }
} 