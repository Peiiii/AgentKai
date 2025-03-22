import { AIModel, Context, Decision, ModelConfig } from '../types';
export declare class OpenAIModel implements AIModel {
    private client;
    private config;
    constructor(config: ModelConfig);
    generateEmbedding(text: string): Promise<number[]>;
    generateText(prompt: string): Promise<string>;
    generateResponse(messages: string[]): Promise<{
        response: string;
        tokens: {
            prompt: number;
            completion: number;
        };
    }>;
    generateDecision(context: Context): Promise<Decision>;
    private buildDecisionPrompt;
}
