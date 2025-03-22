import { AISystem } from '../core/AISystem';
import { MemorySystem } from '../memory/MemorySystem';
import { ToolRegistration } from '../services/tools';
import { Memory } from '../types';
import { Logger } from '../utils/logger';

/**
 * 记忆管理工具插件，提供记忆相关功能
 */
export class MemoryPlugin {
  private logger: Logger;
  private memorySystem: MemorySystem;

  constructor(aiSystem: AISystem) {
    this.logger = new Logger('MemoryPlugin');
    this.memorySystem = aiSystem.getMemorySystem();
  }

  getName(): string {
    return 'MemoryPlugin';
  }

  /**
   * 获取所有记忆工具注册项
   */
  getTools(): ToolRegistration[] {
    return [
      this.createAddMemoryToolRegistration(),
      this.createSearchMemoriesToolRegistration()
    ];
  }

  /**
   * 创建添加记忆工具
   */
  private createAddMemoryToolRegistration(): ToolRegistration {
    return {
      name: 'add_memory',
      description: '添加记忆到长期记忆系统',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: '记忆内容'
          },
          importance: {
            type: 'number',
            description: '重要性 (0.0-1.0)'
          },
          type: {
            type: 'string',
            description: '记忆类型',
            enum: ['fact', 'event', 'goal', 'decision']
          }
        },
        required: ['content']
      },
      handler: async (args) => {
        try {
          const { content, importance = 0.8, type = 'fact' } = args;
          
          const preview = content.length > 50 
            ? `${content.substring(0, 50)}...` 
            : content;
          
          this.logger.info(`添加记忆: "${preview}"`);
          this.logger.debug(`记忆类型: ${type}, 重要性: ${importance}`);
          
          await this.memorySystem.addMemory(content, {
            type,
            importance: parseFloat(importance.toString()) || 0.8,
            timestamp: Date.now(),
            source: 'memory_plugin'
          });
          
          return { 
            success: true, 
            message: '记忆已成功添加到长期记忆系统' 
          };
        } catch (error) {
          this.logger.error('添加记忆失败', error);
          throw error;
        }
      }
    };
  }

  /**
   * 创建搜索记忆工具
   */
  private createSearchMemoriesToolRegistration(): ToolRegistration {
    return {
      name: 'search_memories',
      description: '在长期记忆系统中搜索记忆',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词或短语'
          },
          limit: {
            type: 'integer',
            description: '返回结果数量上限'
          }
        },
        required: ['query']
      },
      handler: async (args) => {
        try {
          const { query, limit = 5 } = args;
          
          this.logger.info(`搜索记忆: "${query}"`);
          
          const memories = await this.memorySystem.searchMemories(query, 
            parseInt(limit.toString()) || 5);
          
          this.logger.info(`找到 ${memories.length} 条相关记忆`);
          
          // 处理结果，只返回需要的字段
          return memories.map((memory: Memory) => ({
            id: memory.id,
            content: memory.content,
            type: memory.type,
            timestamp: memory.timestamp,
            similarity: memory.metadata?.similarity || 0
          }));
        } catch (error) {
          this.logger.error('搜索记忆失败', error);
          throw error;
        }
      }
    };
  }
} 