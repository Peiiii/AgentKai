import { EmbeddingProvider } from './EmbeddingProvider';
import { Logger } from '../../utils/logger';

/**
 * 假的嵌入向量提供者，用于测试
 * 生成随机向量，但对于同一文本总是返回相同的向量
 */
export class FakeEmbeddingProvider implements EmbeddingProvider {
    private dimensions: number;
    private cache: Map<string, number[]>;
    private logger: Logger;

    /**
     * 创建一个假的嵌入向量提供者
     * @param dimensions 向量维度，默认为128
     */
    constructor(dimensions: number = 128) {
        this.dimensions = dimensions;
        this.cache = new Map<string, number[]>();
        this.logger = new Logger('FakeEmbeddingProvider');
    }

    /**
     * 获取文本的嵌入向量
     * 对于相同文本总是返回相同向量
     * @param text 要嵌入的文本
     * @returns 向量表示
     */
    async getEmbedding(text: string): Promise<number[]> {
        // 使用缓存，确保相同文本得到相同向量
        if (this.cache.has(text)) {
            return this.cache.get(text)!;
        }

        this.logger.debug(`生成文本的假嵌入向量，长度: ${text.length}`);
        
        // 使用文本的哈希生成伪随机种子
        const seed = this.hashString(text);
        const embedding = this.generatePseudoRandomVector(seed);
        
        // 缓存结果
        this.cache.set(text, embedding);
        
        return embedding;
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
        return 'FakeEmbeddingProvider';
    }

    /**
     * 生成文本的简单哈希值
     * @param text 要哈希的文本
     * @returns 数字哈希值
     */
    private hashString(text: string): number {
        let hash = 0;
        if (text.length === 0) return hash;
        
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        
        return hash;
    }

    /**
     * 基于种子生成伪随机向量
     * @param seed 随机种子
     * @returns 归一化的单位向量
     */
    private generatePseudoRandomVector(seed: number): number[] {
        const vector: number[] = [];
        
        // 使用简单的线性同余生成器创建伪随机数
        let currentSeed = seed;
        
        for (let i = 0; i < this.dimensions; i++) {
            // 线性同余伪随机数生成
            currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
            // 映射到[-1, 1]范围
            const value = (currentSeed / 2147483648) - 1;
            vector.push(value);
        }
        
        // 归一化向量
        return this.normalizeVector(vector);
    }

    /**
     * 将向量归一化为单位向量
     * @param vector 输入向量
     * @returns 归一化后的单位向量
     */
    private normalizeVector(vector: number[]): number[] {
        // 计算向量的模（长度）
        let magnitude = 0;
        for (const value of vector) {
            magnitude += value * value;
        }
        magnitude = Math.sqrt(magnitude);
        
        // 归一化
        if (magnitude === 0) {
            // 避免除以零
            return vector.map(() => 0);
        }
        
        return vector.map(value => value / magnitude);
    }
} 