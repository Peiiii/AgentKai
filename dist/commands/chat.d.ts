import { AISystem } from '../core/AISystem';
export declare class ChatCommand {
    private system;
    private logger;
    constructor(system: AISystem);
    execute(): Promise<void>;
}
