import { AISystem } from '../core/AISystem';
export interface GoalCommandOptions {
    add?: string;
    list?: boolean;
    complete?: string;
    progress?: string;
    status?: string;
    remove?: string;
}
export declare class GoalCommand {
    private system;
    constructor(system: AISystem);
    execute(options: GoalCommandOptions): Promise<void>;
    private addGoal;
    private completeGoal;
    private updateProgress;
    private updateStatus;
    private removeGoal;
    private listGoals;
}
