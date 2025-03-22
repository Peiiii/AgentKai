"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalManager = void 0;
const types_1 = require("../types");
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
class GoalManager {
    constructor(storage) {
        this.storage = storage;
        this.goals = [];
        this.logger = new logger_1.Logger('GoalManager');
    }
    async initialize() {
        try {
            this.goals = await this.storage.loadGoals();
            if (this.goals.length > 0) {
                this.logger.info(`已加载 ${this.goals.length} 个目标`);
            }
        }
        catch (error) {
            this.logger.warn('加载目标时出错，将使用空列表:', error);
            this.goals = [];
        }
    }
    async addGoal(goal) {
        this.logger.info('添加新目标:', { description: goal.description });
        const newGoal = {
            ...goal,
            id: (0, uuid_1.v4)(),
            createdAt: Date.now(),
            status: types_1.GoalStatus.PENDING,
            progress: 0,
            updatedAt: Date.now(),
            completedAt: undefined
        };
        this.goals.push(newGoal);
        await this.storage.saveGoal(newGoal);
        this.logger.info('目标已保存', { totalGoals: this.goals.length });
        return newGoal;
    }
    async getGoal(id) {
        const goal = this.goals.find(g => g.id === id);
        if (!goal) {
            this.logger.warn(`目标 ${id} 不存在`);
            throw new Error(`Goal ${id} not found`);
        }
        this.logger.debug('获取目标:', { id, description: goal.description });
        return goal;
    }
    async getActiveGoals() {
        const activeGoals = this.goals.filter(g => g.status === types_1.GoalStatus.ACTIVE);
        this.logger.debug('获取活跃目标数量:', { count: activeGoals.length });
        return activeGoals;
    }
    async getAllGoals() {
        this.logger.debug('获取所有目标数量:', { count: this.goals.length });
        return [...this.goals];
    }
    async updateGoalStatus(goalId, status) {
        const goal = await this.getGoal(goalId);
        this.logger.info(`更新目标 ${goalId} 状态`, { oldStatus: goal.status, newStatus: status });
        goal.status = status;
        goal.updatedAt = Date.now();
        if (status === types_1.GoalStatus.COMPLETED) {
            goal.completedAt = Date.now();
            goal.progress = 1;
            this.logger.info(`目标已完成`, { id: goalId, description: goal.description });
        }
        await this.storage.saveGoal(goal);
    }
    async updateGoalProgress(goalId, progress) {
        const goal = await this.getGoal(goalId);
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
    async clearGoals() {
        this.logger.info('清空所有目标');
        this.goals = [];
        await this.storage.clear();
    }
    async activateGoal(goalId) {
        const goal = await this.getGoal(goalId);
        this.logger.info(`激活目标 ${goalId}`, { description: goal.description });
        goal.status = types_1.GoalStatus.ACTIVE;
        goal.updatedAt = Date.now();
        await this.storage.saveGoal(goal);
    }
    async deactivateGoal(goalId) {
        const goal = await this.getGoal(goalId);
        this.logger.info(`停用目标 ${goalId}`, { description: goal.description });
        goal.status = types_1.GoalStatus.PENDING;
        goal.updatedAt = Date.now();
        await this.storage.saveGoal(goal);
    }
    async deleteGoal(id) {
        this.logger.info(`删除目标 ${id}`);
        const index = this.goals.findIndex(g => g.id === id);
        if (index !== -1) {
            this.goals.splice(index, 1);
            await this.storage.deleteGoal(id);
            this.logger.info('目标已删除');
        }
    }
}
exports.GoalManager = GoalManager;
