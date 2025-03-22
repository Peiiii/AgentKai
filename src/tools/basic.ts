import { Tool } from '../types';
import { MemorySystem } from '../memory/MemorySystem';
import { GoalManager } from '../goals/GoalManager';

export function createMemoryTools(memory: MemorySystem): Tool[] {
    return [
        {
            id: 'add_memory',
            name: '添加记忆',
            description: '将重要信息添加到长期记忆系统',
            category: 'memory',
            parameters: [
                {
                    name: 'content',
                    type: 'string',
                    description: '要记住的内容',
                    required: true
                },
                {
                    name: 'importance',
                    type: 'number',
                    description: '重要性评分（0.0-1.0），数值越高越重要',
                    required: false,
                    default: 0.8
                },
                {
                    name: 'type',
                    type: 'string',
                    description: '记忆类型，可以是fact（事实）、preference（偏好）、entity（实体）、conversation（对话）',
                    required: false,
                    default: 'fact'
                }
            ],
            handler: async (params: Record<string, any>) => {
                try {
                    const { content, importance = 0.8, type = 'fact' } = params;
                    if (!content) {
                        throw new Error('记忆内容不能为空');
                    }
                    
                    console.log(`[工具] 添加记忆: "${content.substring(0, 50)}..."`);
                    console.log(`[工具] 记忆类型: ${type}`);
                    console.log(`[工具] 重要性: ${importance}`);
                    
                    await memory.addMemory(content, {
                        type,
                        importance: parseFloat(importance) || 0.8,
                        timestamp: Date.now(),
                        source: 'ai_tool',  // 标记来源为AI工具调用
                    });
                    
                    return {
                        success: true,
                        data: {
                            message: '记忆已添加到长期记忆系统',
                            content,
                            type,
                            importance,
                        }
                    };
                } catch (error) {
                    console.error('[工具错误] 添加记忆失败:', error);
                    return {
                        success: false,
                        error: `添加记忆失败: ${error}`
                    };
                }
            }
        },
        {
            id: 'search_memories',
            name: '搜索记忆',
            description: '在长期记忆中搜索相关信息',
            category: 'memory',
            parameters: [
                {
                    name: 'query',
                    type: 'string',
                    description: '搜索关键词',
                    required: true
                },
                {
                    name: 'limit',
                    type: 'number',
                    description: '返回结果数量上限，默认5条',
                    required: false,
                    default: 5
                }
            ],
            handler: async (params: Record<string, any>) => {
                try {
                    const { query, limit = 5 } = params;
                    if (!query) {
                        throw new Error('搜索关键词不能为空');
                    }
                    
                    console.log(`[工具] 搜索记忆: "${query}"`);
                    const results = await memory.searchMemories(query, parseInt(limit) || 5);
                    console.log(`[工具] 找到记忆数量: ${results.length}`);
                    
                    return {
                        success: true,
                        data: results
                    };
                } catch (error) {
                    console.error('[工具错误] 搜索记忆失败:', error);
                    return {
                        success: false,
                        error: `搜索记忆失败: ${error}`
                    };
                }
            }
        }
    ];
}

export function createGoalTools(goalManager: GoalManager): Tool[] {
    return [
        {
            id: 'add_goal',
            name: '添加目标',
            description: '添加新的目标',
            category: 'goal',
            parameters: [
                {
                    name: 'description',
                    type: 'string',
                    description: '目标描述',
                    required: true
                },
                {
                    name: 'priority',
                    type: 'number',
                    description: '目标优先级',
                    required: false,
                    default: 1
                }
            ],
            handler: async (params) => {
                return await goalManager.addGoal({
                    description: params.description,
                    priority: params.priority,
                    dependencies: [],
                    subGoals: [],
                    metadata: {},
                    metrics: {}
                });
            }
        },
        {
            id: 'list_goals',
            name: '列出目标',
            description: '列出所有目标',
            category: 'goal',
            parameters: [],
            handler: async () => {
                return await goalManager.getAllGoals();
            }
        },
        {
            id: 'update_goal_progress',
            name: '更新目标进度',
            description: '更新指定目标的进度',
            category: 'goal',
            parameters: [
                {
                    name: 'goalId',
                    type: 'string',
                    description: '目标ID',
                    required: true
                },
                {
                    name: 'progress',
                    type: 'number',
                    description: '进度值(0-1)',
                    required: true
                }
            ],
            handler: async (params) => {
                return await goalManager.updateGoalProgress(params.goalId, params.progress);
            }
        }
    ];
} 