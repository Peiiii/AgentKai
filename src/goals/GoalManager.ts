import { Goal, GoalStatus, GoalStorageProvider } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';

export class GoalManager {
    private goals: Goal[];
    private storage: GoalStorageProvider;
    private logger: Logger;

    constructor(storage: GoalStorageProvider) {
        this.storage = storage;
        this.goals = [];
        this.logger = new Logger('GoalManager');
    }

    async initialize(): Promise<void> {
        try {
            this.goals = await this.storage.loadGoals();
            if (this.goals.length > 0) {
                this.logger.info(`已加载 ${this.goals.length} 个目标`);
            }
        } catch (error) {
            this.logger.warn('加载目标时出错，将使用空列表:', error);
            this.goals = [];
        }
    }

    async addGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'status' | 'progress' | 'updatedAt' | 'completedAt'>): Promise<Goal> {
        this.logger.info('添加新目标:', { description: goal.description });
        const newGoal: Goal = {
            ...goal,
            id: uuidv4(),
            createdAt: Date.now(),
            status: GoalStatus.PENDING,
            progress: 0,
            updatedAt: Date.now(),
            completedAt: undefined,
            metrics: goal.metrics || {}
        };

        this.goals.push(newGoal);
        await this.storage.saveGoal(newGoal);
        this.logger.info('目标已保存', { totalGoals: this.goals.length });
        return newGoal;
    }

    async getGoal(id: string): Promise<Goal | null> {
        const goal = this.goals.find(g => g.id === id);
        if (!goal) {
            this.logger.warn(`目标 ${id} 不存在`);
            return null;
        }
        this.logger.debug('获取目标:', { id, description: goal.description });
        return goal;
    }

    async getActiveGoals(): Promise<Goal[]> {
        const activeGoals = this.goals.filter(g => g.status === GoalStatus.ACTIVE);
        this.logger.debug('获取活跃目标数量:', { count: activeGoals.length });
        return activeGoals;
    }

    async getAllGoals(): Promise<Goal[]> {
        this.logger.debug('获取所有目标数量:', { count: this.goals.length });
        return [...this.goals];
    }

    async updateGoalStatus(goalId: string, status: GoalStatus): Promise<void> {
        const goal = await this.getGoal(goalId);
        if (!goal) return;
        
        this.logger.info(`更新目标 ${goalId} 状态`, { oldStatus: goal.status, newStatus: status });
        goal.status = status;
        goal.updatedAt = Date.now();
        
        if (status === GoalStatus.COMPLETED) {
            goal.completedAt = Date.now();
            goal.progress = 1;
            this.logger.info(`目标已完成`, { id: goalId, description: goal.description });
        }
        
        await this.storage.saveGoal(goal);
    }

    async updateGoalProgress(goalId: string, progress: number): Promise<void> {
        const goal = await this.getGoal(goalId);
        if (!goal) return;
        
        const oldProgress = goal.progress;
        goal.progress = Math.max(0, Math.min(1, progress));
        goal.updatedAt = Date.now();
        this.logger.info(`更新目标进度`, { 
            id: goalId, 
            description: goal.description, 
            oldProgress, 
            newProgress: goal.progress 
        });
        await this.storage.saveGoal(goal);
    }

    async clearGoals(): Promise<void> {
        this.logger.info('清空所有目标');
        this.goals = [];
        await this.storage.clear();
    }

    async activateGoal(goalId: string): Promise<void> {
        const goal = await this.getGoal(goalId);
        if (!goal) return;
        
        this.logger.info(`激活目标 ${goalId}`, { description: goal.description });
        goal.status = GoalStatus.ACTIVE;
        goal.updatedAt = Date.now();
        await this.storage.saveGoal(goal);
    }

    async deactivateGoal(goalId: string): Promise<void> {
        const goal = await this.getGoal(goalId);
        if (!goal) return;
        
        this.logger.info(`停用目标 ${goalId}`, { description: goal.description });
        goal.status = GoalStatus.PENDING;
        goal.updatedAt = Date.now();
        await this.storage.saveGoal(goal);
    }

    async deleteGoal(id: string): Promise<boolean> {
        this.logger.info(`删除目标 ${id}`);
        const index = this.goals.findIndex(g => g.id === id);
        if (index !== -1) {
            this.goals.splice(index, 1);
            await this.storage.deleteGoal(id);
            this.logger.info('目标已删除');
            return true;
        }
        return false;
    }

    async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
        const goal = this.goals.find(g => g.id === id);
        if (!goal) {
            this.logger.warn(`目标 ${id} 不存在，无法更新`);
            return null;
        }

        // 记录原始时间戳用于调试
        const originalTimestamp = goal.updatedAt;
        
        // 更新目标属性（使用显式分配而不是Object.assign）
        if (updates.description !== undefined) goal.description = updates.description;
        if (updates.priority !== undefined) goal.priority = updates.priority;
        if (updates.status !== undefined) goal.status = updates.status;
        if (updates.progress !== undefined) goal.progress = updates.progress;
        if (updates.metadata !== undefined) goal.metadata = updates.metadata;
        if (updates.metrics !== undefined) goal.metrics = updates.metrics;
        if (updates.dependencies !== undefined) goal.dependencies = updates.dependencies;
        if (updates.subGoals !== undefined) goal.subGoals = updates.subGoals;
        
        // 强制更新时间戳
        goal.updatedAt = Date.now() + 1; // 确保新时间戳总是大于之前的时间戳
        
        // 如果状态更新为完成，设置完成时间和进度
        if (updates.status === GoalStatus.COMPLETED && goal.completedAt === undefined) {
            goal.completedAt = Date.now();
            goal.progress = 1;
        }
        
        await this.storage.saveGoal(goal);
        this.logger.info(`目标 ${id} 已更新`, { 
            description: goal.description,
            oldTimestamp: originalTimestamp,
            newTimestamp: goal.updatedAt
        });
        
        return goal;
    }

    async addDependency(childId: string, parentId: string): Promise<boolean> {
        // 检查循环依赖
        if (childId === parentId) {
            this.logger.warn(`不能添加自循环依赖: ${childId}`);
            return false;
        }
        
        const child = this.goals.find(g => g.id === childId);
        const parent = this.goals.find(g => g.id === parentId);
        
        if (!child || !parent) {
            this.logger.warn(`目标不存在，无法添加依赖`, { childId, parentId });
            return false;
        }
        
        // 检查是否会形成循环依赖
        if (this.wouldCreateCircularDependency(childId, parentId)) {
            this.logger.warn(`添加依赖会形成循环依赖`, { childId, parentId });
            return false;
        }
        
        // 添加依赖关系
        if (!child.dependencies.includes(parentId)) {
            child.dependencies.push(parentId);
            child.updatedAt = Date.now();
            await this.storage.saveGoal(child);
        }
        
        // 添加子目标关系
        if (!parent.subGoals.includes(childId)) {
            parent.subGoals.push(childId);
            parent.updatedAt = Date.now();
            await this.storage.saveGoal(parent);
        }
        
        this.logger.info(`已添加依赖关系`, { 
            child: { id: childId, description: child.description },
            parent: { id: parentId, description: parent.description }
        });
        
        return true;
    }

    private wouldCreateCircularDependency(childId: string, parentId: string): boolean {
        // 检查parent是否依赖于child
        const visited = new Set<string>();
        const checkDependency = (goalId: string): boolean => {
            if (goalId === childId) return true;
            if (visited.has(goalId)) return false;
            
            visited.add(goalId);
            const goal = this.goals.find(g => g.id === goalId);
            if (!goal) return false;
            
            return goal.dependencies.some(depId => checkDependency(depId));
        };
        
        return checkDependency(parentId);
    }

    async balanceActiveGoals(maxActiveGoals: number = 3): Promise<void> {
        const activeGoals = await this.getActiveGoals();
        
        if (activeGoals.length <= maxActiveGoals) {
            this.logger.debug(`活跃目标数量(${activeGoals.length})未超过限制(${maxActiveGoals})`);
            return;
        }
        
        this.logger.info(`需要平衡活跃目标数量: ${activeGoals.length} -> ${maxActiveGoals}`);
        
        // 按优先级排序，高优先级在前
        const sortedGoals = [...activeGoals].sort((a, b) => b.priority - a.priority);
        
        // 将超出限制的低优先级目标设为待定状态
        const goalsToDeactivate = sortedGoals.slice(maxActiveGoals);
        for (const goal of goalsToDeactivate) {
            this.logger.info(`停用低优先级目标: ${goal.description}, 优先级: ${goal.priority}`);
            await this.updateGoalStatus(goal.id, GoalStatus.PENDING);
        }
        
        this.logger.info(`已平衡活跃目标数量，当前活跃: ${maxActiveGoals}`);
    }
}
