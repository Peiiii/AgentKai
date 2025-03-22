import { AISystem } from '../core/AISystem';
export interface MemoryCommandOptions {
    add?: string;
    search?: string;
    list?: boolean;
    remove?: string;
}
export declare class MemoryCommand {
    private system;
    private logger;
    constructor(system: AISystem);
    execute(options: MemoryCommandOptions): Promise<void>;
    private addMemory;
    private searchMemories;
    private listMemories;
    private removeMemory;
    private displayMemories;
}
