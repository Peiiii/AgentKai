import { UUID, Timestamp } from './common';
export interface ConsciousnessState {
    currentFocus: string;
    emotionalState: string;
    selfAwareness: number;
    decisionConfidence: number;
}
export interface Decision {
    id: UUID;
    action: string;
    confidence: number;
    reasoning: string[];
    timestamp: Timestamp;
    context: {
        memories: UUID[];
        tools: UUID[];
        goals: UUID[];
    };
    outcome?: {
        success: boolean;
        feedback: string;
        impact: Record<string, number>;
    };
}
export interface Experience {
    decision: Decision;
    success: boolean;
    feedback: string;
    impact: Record<string, number>;
}
export interface Context {
    memories: Memory[];
    tools: Tool[];
    environment: Record<string, any>;
}
export interface Memory {
    id: UUID;
    content: string;
    type: 'event' | 'fact' | 'thought';
    timestamp: Timestamp;
    importance: number;
    embeddings: number[];
    associations: UUID[];
    metadata: Record<string, any>;
}
export interface Tool {
    id: UUID;
    name: string;
    description: string;
    capabilities: string[];
    parameters: Parameter[];
    status: 'available' | 'busy' | 'error';
}
export interface Parameter {
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
}
