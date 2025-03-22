import { Decision, DecisionConfig } from '../types';
export declare class DecisionEngine {
    private config;
    constructor(config: DecisionConfig);
    makeDecision(_input: string, _systemPrompt: string): Promise<Decision>;
}
