import { MemorySystem } from '../memory/MemorySystem';
import { MemoryType } from '../types';
import { Logger } from '../utils/logger';

// 记忆插件工具函数定义
type MemoryTool = {
  name: string;
  description: string;
  parameters: any[];
  handler: (params: any) => Promise<any>;
};

/**
 * 记忆管理工具插件，提供记忆相关功能
 */
export class MemoryPlugin {
  private memorySystem: MemorySystem;
  private logger: Logger;

  constructor(memorySystem: MemorySystem) {
    this.memorySystem = memorySystem;
    this.logger = new Logger('MemoryPlugin');
  }

  /**
   * 获取插件名称
   * @returns 插件名称
   */
  getName(): string {
    return 'memory';
  }

  /**
   * 获取该插件提供的工具
   * @returns 工具配置数组
   */
  getTools(): MemoryTool[] {
    return [
      {
        name: 'addMemory',
        description: '添加新的记忆到长期记忆',
        parameters: [
          {
            name: 'content',
            type: 'string',
            description: '记忆内容',
            required: true
          },
          {
            name: 'type',
            type: 'string',
            description: '记忆类型 (observation, reflection, conversation, fact, plan)',
            required: false
          },
          {
            name: 'importance',
            type: 'number',
            description: '记忆重要性 (0-1)',
            required: false
          }
        ],
        handler: async ({ content, type = 'observation', importance = 0.5 }) => {
          this.logger.info('添加新记忆', { type, contentLength: content.length });
          
          // 验证记忆类型
          let memoryType: MemoryType;
          switch(type.toLowerCase()) {
            case 'observation':
              memoryType = MemoryType.OBSERVATION;
              break;
            case 'reflection':
              memoryType = MemoryType.REFLECTION;
              break;
            case 'conversation':
              memoryType = MemoryType.CONVERSATION;
              break;
            case 'fact':
              memoryType = MemoryType.FACT;
              break;
            case 'plan':
              memoryType = MemoryType.PLAN;
              break;
            default:
              memoryType = MemoryType.OBSERVATION;
          }
          
          // 创建记忆
          await this.memorySystem.createMemory(content, memoryType, {
            importance
          });
          
          return {
            success: true,
            message: '记忆已添加'
          };
        }
      },
      {
        name: 'searchMemory',
        description: '搜索记忆',
        parameters: [
          {
            name: 'query',
            type: 'string',
            description: '搜索查询',
            required: true
          },
          {
            name: 'limit',
            type: 'number',
            description: '返回结果数量限制',
            required: false
          },
          {
            name: 'type',
            type: 'string',
            description: '记忆类型筛选',
            required: false
          }
        ],
        handler: async ({ query, limit = 5, type = null }) => {
          this.logger.info('搜索记忆', { query, limit, type });
          
          let memories;
          if (type) {
            // 将字符串类型转换为枚举类型
            let memoryType: MemoryType | undefined;
            switch(type.toLowerCase()) {
              case 'observation': memoryType = MemoryType.OBSERVATION; break;
              case 'reflection': memoryType = MemoryType.REFLECTION; break;
              case 'conversation': memoryType = MemoryType.CONVERSATION; break;
              case 'fact': memoryType = MemoryType.FACT; break;
              case 'plan': memoryType = MemoryType.PLAN; break;
              default: memoryType = undefined;
            }
            
            if (memoryType) {
              // 先获取指定类型的记忆
              const typeMemories = await this.memorySystem.getMemoriesByType(memoryType);
              // 然后在内存中过滤包含查询关键词的记忆
              memories = typeMemories
                .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
                .slice(0, limit);
            } else {
              memories = await this.memorySystem.searchMemories(query, limit);
            }
          } else {
            memories = await this.memorySystem.searchMemories(query, limit);
          }
          
          const formattedMemories = memories.map(memory => {
            return {
              id: memory.id,
              content: memory.content,
              type: memory.type,
              createdAt: memory.createdAt,
              metadata: memory.metadata
            };
          });
          
          return {
            success: true,
            count: formattedMemories.length,
            memories: formattedMemories
          };
        }
      },
      {
        name: 'getRecentMemories',
        description: '获取最近的记忆',
        parameters: [
          {
            name: 'limit',
            type: 'number',
            description: '返回结果数量限制',
            required: false
          },
          {
            name: 'type',
            type: 'string',
            description: '记忆类型筛选',
            required: false
          }
        ],
        handler: async ({ limit = 5, type = null }) => {
          this.logger.info('获取最近记忆', { limit, type });
          
          let memoryType: MemoryType | undefined;
          if (type) {
            switch(type.toLowerCase()) {
              case 'observation': memoryType = MemoryType.OBSERVATION; break;
              case 'reflection': memoryType = MemoryType.REFLECTION; break;
              case 'conversation': memoryType = MemoryType.CONVERSATION; break;
              case 'fact': memoryType = MemoryType.FACT; break;
              case 'plan': memoryType = MemoryType.PLAN; break;
              default: memoryType = undefined;
            }
          }
          
          const memories = memoryType ? await this.memorySystem.getMemoriesByType(memoryType) : await this.memorySystem.getRecentMemories(limit);
          
          const formattedMemories = memories.map(memory => {
            return {
              id: memory.id,
              content: memory.content,
              type: memory.type,
              createdAt: memory.createdAt,
              metadata: memory.metadata
            };
          });
          
          return {
            success: true,
            count: formattedMemories.length,
            memories: formattedMemories
          };
        }
      },
      {
        name: 'deleteMemory',
        description: '删除指定ID的记忆',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: '记忆ID',
            required: true
          }
        ],
        handler: async ({ id }) => {
          this.logger.info('删除记忆', { id });
          
          const success = await this.memorySystem.deleteMemory(id);
          return {
            success,
            message: success ? '记忆已删除' : '删除记忆失败，可能记忆不存在'
          };
        }
      },
      {
        name: 'clearAllMemories',
        description: '清空所有记忆（谨慎使用！）',
        parameters: [],
        handler: async () => {
          this.logger.warn('清空所有记忆');
          
          await this.memorySystem.clearMemories();
          return {
            success: true,
            message: '所有记忆已清空'
          };
        }
      }
    ];
  }
} 