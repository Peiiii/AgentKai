import { AIModel, Context, Vector, Decision } from '../types';
interface OpenAIConfig {
    apiKey: string;
    baseURL?: string;
    model?: string;
    embeddingModel?: string;
    embeddingBaseURL?: string;
}
export declare class OpenAIModel implements AIModel {
    private client;
    private model;
    private embeddingModel;
    private embeddingClient;
    constructor(config: OpenAIConfig);
    generateEmbedding(text: string): Promise<Vector>;
    generateText(prompt: string): Promise<string>;
    generateDecision(context: Context): Promise<Decision>;
    generateResponse(messages: string[]): Promise<{
        response: string;
        tokens: {
            prompt: number;
            completion: number;
        };
    }>;
}
export {};
