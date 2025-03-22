"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalCommand = void 0;
const types_1 = require("../types");
class GoalCommand {
    constructor(system) {
        this.system = system;
    }
    async execute(options) {
        if (options.add) {
            await this.addGoal(options.add);
        }
        if (options.complete) {
            await this.completeGoal(options.complete);
        }
        if (options.progress) {
            const [id, progress] = options.progress.split(' ');
            await this.updateProgress(id, parseFloat(progress));
        }
        if (options.status) {
            const [id, status] = options.status.split(' ');
            await this.updateStatus(id, status);
        }
        if (options.remove) {
            await this.removeGoal(options.remove);
        }
        // 如果没有其他操作，或者显式要求列出，则显示所有目标
        if (!options.add && !options.complete && !options.progress && !options.status && !options.remove || options.list) {
            await this.listGoals();
        }
    }
    async addGoal(description) {
        console.log('[目标系统] 添加目标:', description);
        const goal = await this.system.addGoal({
            description,
            priority: 1,
            dependencies: [],
            subGoals: [],
            metadata: {},
            metrics: {},
        });
        console.log('[目标系统] 目标已创建:', goal);
    }
    async completeGoal(id) {
        await this.system.updateGoalStatus(id, types_1.GoalStatus.COMPLETED);
        console.log('[目标系统] 目标已完成');
    }
    async updateProgress(id, progress) {
        if (isNaN(progress) || progress < 0 || progress > 1) {
            throw new Error('进度必须是0-1之间的数字');
        }
        await this.system.updateGoalProgress(id, progress);
        console.log('[目标系统] 目标进度已更新');
    }
    async updateStatus(id, status) {
        if (!Object.values(types_1.GoalStatus).includes(status)) {
            throw new Error('无效的目标状态');
        }
        await this.system.updateGoalStatus(id, status);
        console.log('[目标系统] 目标状态已更新');
    }
    async removeGoal(id) {
        await this.system.deleteGoal(id);
        console.log('[目标系统] 目标已删除');
    }
    async listGoals() {
        console.log('[目标系统] 获取所有目标');
        const goals = await this.system.getAllGoals();
        console.log('\n所有目标:');
        console.log('----------------------------------------');
        if (goals.length === 0) {
            console.log('没有找到目标。');
            return;
        }
        goals.forEach((goal) => {
            console.log(`目标 ${goal.id}:`);
            console.log(`  描述: ${goal.description}`);
            console.log(`  状态: ${goal.status}`);
            console.log(`  进度: ${goal.progress * 100}%`);
            console.log('----------------------------------------');
        });
    }
}
exports.GoalCommand = GoalCommand;
