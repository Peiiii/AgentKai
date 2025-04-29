import { ToolRegistration } from '../../types/tool';

export interface Plugin {
    getName(): string;
    getTools(): ToolRegistration[];
}