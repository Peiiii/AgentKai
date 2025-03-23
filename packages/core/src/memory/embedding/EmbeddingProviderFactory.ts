import { ModelConfig } from '../../types/config';
import { ConfigService } from '../../services/config';
import { EmbeddingProvider } from './EmbeddingProvider';
import { FakeEmbeddingProvider } from './FakeEmbeddingProvider';
import { OpenAIEmbeddingProvider } from './OpenAIEmbeddingProvider';
import { Logger } from '../../utils/logger';

/**
 * 嵌入提供者工厂类，用于创建不同类型的嵌入提供者
 */
export class EmbeddingProviderFactory {
    private static logger = new Logger('EmbeddingProviderFactory');

    /**
     * 创建嵌入提供者
     * @param type 提供者类型，可以是'fake'、'openai'等
     * @param config 模型配置（可选）
     * @returns 嵌入提供者实例
     */
    static createProvider(type: string = 'fake', config?: ModelConfig): EmbeddingProvider {
        this.logger.info(`创建嵌入提供者，类型: ${type}`);
        
        // 如果没有提供配置，尝试从ConfigService获取
        if (!config) {
            try {
                const configService = ConfigService.getInstance();
                config = configService.getAIModelConfig() as ModelConfig;
                this.logger.debug('从ConfigService获取AI模型配置');
            } catch (error) {
                this.logger.warn('无法从ConfigService获取配置，将使用默认值', error);
            }
        }
        
        switch (type.toLowerCase()) {
            case 'openai':
                return this.createOpenAIProvider(config);
            case 'fake':
            default:
                return this.createFakeProvider();
        }
    }
    
    /**
     * 创建OpenAI嵌入提供者
     * @param config 模型配置
     * @returns OpenAI嵌入提供者
     */
    private static createOpenAIProvider(config?: ModelConfig): EmbeddingProvider {
        if (!config) {
            throw new Error('创建OpenAI嵌入提供者需要配置');
        }
        
        this.logger.info('创建OpenAI嵌入提供者');
        return new OpenAIEmbeddingProvider(
            config.apiKey,
            config.embeddingModel || 'text-embedding-ada-002',
            config.embeddingBaseUrl,
            config.embeddingDimensions || 1024
        );
    }
    
    /**
     * 创建假的嵌入提供者（用于测试）
     * @param dimensions 向量维度
     * @returns 假的嵌入提供者
     */
    private static createFakeProvider(dimensions: number = 384): EmbeddingProvider {
        this.logger.info(`创建假的嵌入提供者，维度: ${dimensions}`);
        return new FakeEmbeddingProvider(dimensions);
    }
} 