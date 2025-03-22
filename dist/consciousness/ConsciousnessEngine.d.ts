import { ConsciousnessState, Decision, Experience, Memory, Goal } from '../types';
export declare class ConsciousnessEngine {
    private state;
    private decisionHistory;
    private learningRate;
    private confidenceThreshold;
    constructor();
    selfReflect(): Promise<void>;
    evaluateState(): Promise<ConsciousnessState>;
    makeDecision(input: string, memories: Memory[], goals: Goal[]): Promise<Decision>;
    private analyzeState;
    learnFromExperience(experience: Experience): Promise<void>;
    private determineFocus;
    private evaluateEmotionalState;
    private calculateSelfAwareness;
    private calculateConfidence;
    private evaluateDecisionConfidence;
    private requestMoreInformation;
    private generateDecision;
    private evaluateDecisionSuccess;
    private updateConfidence;
    private adjustLearningRate;
    private updateDecisionStrategy;
}
