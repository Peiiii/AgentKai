import { Goal, GoalStatus, GoalStorageProvider } from '../types';
export declare class GoalManager {
    private goals;
    private storage;
    private logger;
    constructor(storage: GoalStorageProvider);
    initialize(): Promise<void>;
    addGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'status' | 'progress' | 'updatedAt' | 'completedAt'>): Promise<Goal>;
    getGoal(id: string): Promise<Goal>;
    getActiveGoals(): Promise<Goal[]>;
    getAllGoals(): Promise<Goal[]>;
    updateGoalStatus(goalId: string, status: GoalStatus): Promise<void>;
    updateGoalProgress(goalId: string, progress: number): Promise<void>;
    clearGoals(): Promise<void>;
    activateGoal(goalId: string): Promise<void>;
    deactivateGoal(goalId: string): Promise<void>;
    deleteGoal(id: string): Promise<void>;
}
