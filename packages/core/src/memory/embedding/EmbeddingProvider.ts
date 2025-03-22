/**
 * 嵌入向量提供者接口
 * 负责将文本转换为向量表示
 */
export interface EmbeddingProvider {
    /**
     * 获取文本的嵌入向量表示
     * @param text 要转换为向量的文本
     * @returns 表示文本的向量（数字数组）
     */
    getEmbedding(text: string): Promise<number[]>;
    
    /**
     * 获取提供者的向量维度
     * @returns 向量维度
     */
    getDimensions(): number;
    
    /**
     * 获取提供者的名称
     * @returns 提供者名称
     */
    getName(): string;
} 