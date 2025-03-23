import { AISystem } from '@agentkai/node';
import { Goal, GoalStatus } from '@agentkai/core';
import { Logger, Colors } from '@agentkai/core';

export interface GoalCommandOptions {
    add?: string;
    list?: boolean;
    complete?: string;
    progress?: string;
    status?: string;
    remove?: string;
}

export class GoalCommand {
    private logger: Logger;
    
    constructor(private system: AISystem) {
        this.logger = new Logger('GoalCommand');
    }

    async execute(options: GoalCommandOptions): Promise<void> {
        let operationPerformed = false;
        
        if (options.add) {
            await this.addGoal(options.add);
            operationPerformed = true;
        }

        if (options.complete) {
            await this.completeGoal(options.complete);
            operationPerformed = true;
        }

        if (options.progress) {
            const [id, progress] = options.progress.split(' ');
            await this.updateProgress(id, parseFloat(progress));
            operationPerformed = true;
        }

        if (options.status) {
            const [id, status] = options.status.split(' ');
            await this.updateStatus(id, status as GoalStatus);
            operationPerformed = true;
        }

        if (options.remove) {
            await this.removeGoal(options.remove);
            operationPerformed = true;
        }

        // 如果执行了操作或显式要求列出，则显示所有目标
        if (operationPerformed || options.list) {
            await this.listGoals();
        }
    }

    private async addGoal(description: string): Promise<void> {
        this.logger.section('添加目标');
        this.logger.info(`正在添加新目标: ${description}`);
        
        try {
            const goal = await this.system.addGoal({
                description,
                priority: 1,
                dependencies: [],
                subGoals: [],
                metadata: {},
                metrics: {},
            });
            
            this.logger.success(`目标已创建，ID: ${goal.id}`);
            this.logger.debug('目标详情:', goal);
            
            // 确认目标已保存
            const savedGoal = await this.system.getGoal(goal.id);
            if (savedGoal) {
                this.logger.info('目标已成功保存到存储中');
            } else {
                this.logger.warn('警告: 目标可能未成功保存');
            }
        } catch (error) {
            this.logger.error('添加目标失败:', error);
            throw error;
        }
    }

    private async completeGoal(id: string): Promise<void> {
        this.logger.section('完成目标');
        this.logger.info(`正在完成目标: ${id}`);
        
        await this.system.updateGoalStatus(id, GoalStatus.COMPLETED);
        this.logger.success('目标已标记为完成');
    }

    private async updateProgress(id: string, progress: number): Promise<void> {
        if (isNaN(progress) || progress < 0 || progress > 1) {
            throw new Error('进度必须是0-1之间的数字');
        }
        
        this.logger.section('更新目标进度');
        this.logger.info(`正在更新目标 ${id} 的进度为 ${progress * 100}%`);
        
        await this.system.updateGoalProgress(id, progress);
        this.logger.success('目标进度已更新');
    }

    private async updateStatus(id: string, status: GoalStatus): Promise<void> {
        if (!Object.values(GoalStatus).includes(status)) {
            throw new Error('无效的目标状态');
        }
        
        this.logger.section('更新目标状态');
        this.logger.info(`正在更新目标 ${id} 的状态为 ${status}`);
        
        await this.system.updateGoalStatus(id, status);
        this.logger.success('目标状态已更新');
    }

    private async removeGoal(id: string): Promise<void> {
        this.logger.section('删除目标');
        this.logger.info(`正在删除目标: ${id}`);
        
        await this.system.deleteGoal(id);
        this.logger.success('目标已删除');
    }

    private async listGoals(): Promise<void> {
        this.logger.section('目标列表');
        const goals = await this.system.getAllGoals();
        
        if (goals.length === 0) {
            this.logger.info('没有找到目标');
            return;
        }

        goals.forEach((goal: Goal) => {
            // 根据状态选择颜色
            let statusColor = '';
            switch (goal.status) {
                case GoalStatus.COMPLETED:
                    statusColor = Colors.success;
                    break;
                case GoalStatus.ACTIVE:
                    statusColor = Colors.info;
                    break;
                case GoalStatus.FAILED:
                    statusColor = Colors.error;
                    break;
                default:
                    statusColor = Colors.warn; // PENDING
            }
            
            // 构建进度条
            const progressBarLength = 20;
            const filledLength = Math.round(goal.progress * progressBarLength);
            const progressBar = '█'.repeat(filledLength) + '░'.repeat(progressBarLength - filledLength);
            
            // 打印目标信息
            this.logger.divider();
            this.logger.info(`目标: ${goal.id}`);
            this.logger.info(`描述: ${goal.description}`);
            
            // 状态和进度
            const statusText = `状态: ${statusColor}${goal.status}${Colors.reset}`;
            const progressText = `进度: ${progressBar} ${Math.round(goal.progress * 100)}%`;
            this.logger.info(statusText);
            this.logger.info(progressText);
        });
        
        this.logger.divider();
    }
} 