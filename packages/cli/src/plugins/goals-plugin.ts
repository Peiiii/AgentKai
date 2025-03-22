import { ToolRegistration } from '../services/tools';
import { Logger } from '../utils/logger';
import { GoalManager } from '../goals/GoalManager';
import { Goal, GoalStatus } from '../types';
import { AISystem } from '../core/AISystem';

/**
 * 目标管理工具插件，提供目标相关功能
 */
export class GoalsPlugin {
  private logger: Logger;
  private goalManager: GoalManager;

  constructor(aiSystem: AISystem) {
    this.logger = new Logger('GoalsPlugin');
    this.goalManager = aiSystem.getGoalManager();
  }

  getName(): string {
    return 'GoalsPlugin';
  }

  /**
   * 获取所有目标工具注册项
   */
  getTools(): ToolRegistration[] {
    return [
      this.createAddGoalToolRegistration(),
      this.createListGoalsToolRegistration(),
      this.createUpdateGoalProgressToolRegistration()
    ];
  }

  /**
   * 创建添加目标工具
   */
  private createAddGoalToolRegistration(): ToolRegistration {
    return {
      name: 'add_goal',
      description: '添加新目标到系统',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: '目标描述'
          },
          priority: {
            type: 'integer',
            description: '目标优先级 (1-10, 10为最高优先级)'
          },
          deadline: {
            type: 'string',
            description: '目标截止日期（ISO字符串，如2023-12-31），可选'
          }
        },
        required: ['description']
      },
      handler: async (args) => {
        try {
          const { description, priority = 5, deadline } = args;
          
          this.logger.info(`添加目标: "${description}"`);
          this.logger.debug(`优先级: ${priority}, 截止日期: ${deadline || '无'}`);
          
          // 创建目标
          const goal = await this.goalManager.addGoal({
            description,
            priority: Number(priority),
            dependencies: [],  // 添加空数组作为初始值
            subGoals: [],      // 添加空数组作为初始值
            metadata: {},      // 添加空对象作为初始值
            metrics: {}        // 添加空对象作为初始值
          });
          
          return {
            success: true,
            goal: {
              id: goal.id,
              description: goal.description,
              priority: goal.priority,
              status: goal.status,
              progress: goal.progress,
              createdAt: goal.createdAt
            }
          };
        } catch (error) {
          this.logger.error('添加目标失败', error);
          throw error;
        }
      }
    };
  }

  /**
   * 创建列出目标工具
   */
  private createListGoalsToolRegistration(): ToolRegistration {
    return {
      name: 'list_goals',
      description: '列出当前所有活跃目标',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: '目标状态过滤（active, completed, all）',
            enum: ['active', 'completed', 'all']
          }
        }
      },
      handler: async (args) => {
        try {
          const { status = 'active' } = args;
          this.logger.info(`列出${status === 'all' ? '所有' : status === 'active' ? '活跃' : '已完成'}目标`);
          
          let goals: Goal[] = [];
          
          if (status === 'active') {
            goals = await this.goalManager.getActiveGoals();
          } else if (status === 'completed') {
            // 获取所有目标后过滤已完成的
            const allGoals = await this.goalManager.getAllGoals();
            goals = allGoals.filter(g => g.status === GoalStatus.COMPLETED);
          } else {
            // 获取所有目标
            goals = await this.goalManager.getAllGoals();
          }
          
          this.logger.info(`找到 ${goals.length} 个目标`);
          
          return goals.map(goal => ({
            id: goal.id,
            description: goal.description,
            priority: goal.priority,
            status: goal.status,
            progress: goal.progress,
            createdAt: new Date(goal.createdAt).toISOString(),
            completedAt: goal.completedAt ? new Date(goal.completedAt).toISOString() : null
          }));
        } catch (error) {
          this.logger.error('列出目标失败', error);
          throw error;
        }
      }
    };
  }

  /**
   * 创建更新目标进度工具
   */
  private createUpdateGoalProgressToolRegistration(): ToolRegistration {
    return {
      name: 'update_goal_progress',
      description: '更新目标的进度',
      parameters: {
        type: 'object',
        properties: {
          goalId: {
            type: 'string',
            description: '目标ID'
          },
          progress: {
            type: 'number',
            description: '新的进度值 (0.0-1.0)'
          },
          status: {
            type: 'string',
            description: '新的状态（可选）',
            enum: ['ACTIVE', 'COMPLETED', 'ABANDONED']
          }
        },
        required: ['goalId', 'progress']
      },
      handler: async (args) => {
        try {
          const { goalId, progress, status } = args;
          
          if (!goalId) {
            throw new Error('目标ID不能为空');
          }
          
          const normalizedProgress = Math.max(0, Math.min(1, parseFloat(progress) || 0));
          
          this.logger.info(`更新目标 ${goalId} 进度: ${normalizedProgress}`);
          
          // 先获取目标详情
          const goal = await this.goalManager.getGoal(goalId);
          
          if (!goal) {
            throw new Error(`目标 ${goalId} 不存在`);
          }
          
          // 更新进度
          await this.goalManager.updateGoalProgress(goalId, normalizedProgress);
          
          // 如果提供了状态参数，也更新状态
          if (status) {
            this.logger.info(`更新目标 ${goalId} 状态: ${status}`);
            await this.goalManager.updateGoalStatus(goalId, status as GoalStatus);
          }
          
          // 重新获取更新后的目标
          const updatedGoal = await this.goalManager.getGoal(goalId);
          
          return {
            success: true,
            goal: updatedGoal
          };
        } catch (error) {
          this.logger.error('更新目标进度失败', error);
          throw error;
        }
      }
    };
  }
} 