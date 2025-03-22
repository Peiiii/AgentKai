import { Tool } from '../types';
import { MemorySystem } from '../memory/MemorySystem';
import { GoalManager } from '../goals/GoalManager';
export declare function createMemoryTools(memory: MemorySystem): Tool[];
export declare function createGoalTools(goalManager: GoalManager): Tool[];
