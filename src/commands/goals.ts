import { AISystem } from '../core/AISystem';
import { Goal, GoalStatus } from '../types';

export interface GoalCommandOptions {
    add?: string;
    list?: boolean;
    complete?: string;
    progress?: string;
    status?: string;
    remove?: string;
}

export class GoalCommand {
    constructor(private system: AISystem) {}

    async execute(options: GoalCommandOptions): Promise<void> {
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
            await this.updateStatus(id, status as GoalStatus);
        }

        if (options.remove) {
            await this.removeGoal(options.remove);
        }

        // 如果没有其他操作，或者显式要求列出，则显示所有目标
        if (!options.add && !options.complete && !options.progress && !options.status && !options.remove || options.list) {
            await this.listGoals();
        }
    }

    private async addGoal(description: string): Promise<void> {
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

    private async completeGoal(id: string): Promise<void> {
        await this.system.updateGoalStatus(id, GoalStatus.COMPLETED);
        console.log('[目标系统] 目标已完成');
    }

    private async updateProgress(id: string, progress: number): Promise<void> {
        if (isNaN(progress) || progress < 0 || progress > 1) {
            throw new Error('进度必须是0-1之间的数字');
        }
        await this.system.updateGoalProgress(id, progress);
        console.log('[目标系统] 目标进度已更新');
    }

    private async updateStatus(id: string, status: GoalStatus): Promise<void> {
        if (!Object.values(GoalStatus).includes(status)) {
            throw new Error('无效的目标状态');
        }
        await this.system.updateGoalStatus(id, status);
        console.log('[目标系统] 目标状态已更新');
    }

    private async removeGoal(id: string): Promise<void> {
        await this.system.deleteGoal(id);
        console.log('[目标系统] 目标已删除');
    }

    private async listGoals(): Promise<void> {
        console.log('[目标系统] 获取所有目标');
        const goals = await this.system.getAllGoals();
        
        console.log('\n所有目标:');
        console.log('----------------------------------------');
        
        if (goals.length === 0) {
            console.log('没有找到目标。');
            return;
        }

        goals.forEach((goal: Goal) => {
            console.log(`目标 ${goal.id}:`);
            console.log(`  描述: ${goal.description}`);
            console.log(`  状态: ${goal.status}`);
            console.log(`  进度: ${goal.progress * 100}%`);
            console.log('----------------------------------------');
        });
    }
} 