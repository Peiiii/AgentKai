import { ToolRegistration } from '../services/tools';
import { ConfigService } from '../services/config';
import { Logger } from '../utils/logger';
import { Memory, CreateMemoryInput } from '../types/memory';
import { AISystem } from '../core/AISystem';
import { SystemAdapter } from '../core/adapter';

/**
 * 基础工具插件，提供内置的基本功能
 */
export class BasicToolsPlugin {
  private logger: Logger;
  private config: ConfigService;
  private adapter: SystemAdapter;

  constructor(aiSystem: AISystem) {
    this.logger = new Logger('BasicToolsPlugin');
    this.config = ConfigService.getInstance();
    this.adapter = new SystemAdapter(aiSystem);
  }

  /**
   * 获取所有基础工具注册项
   */
  getTools(): ToolRegistration[] {
    return [
      this.createSearchMemoriesToolRegistration(),
      this.createAddMemoryToolRegistration(),
      this.createWebSearchToolRegistration()
    ];
  }

  /**
   * 创建记忆搜索工具
   */
  private createSearchMemoriesToolRegistration(): ToolRegistration {
    return {
      name: 'search_memories',
      description: '在记忆库中搜索记忆内容',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '要搜索的内容'
          },
          limit: {
            type: 'integer',
            description: '结果数量上限'
          }
        },
        required: ['query']
      },
      handler: async (args) => {
        try {
          const query = args.query;
          const limit = args.limit || 5;
          
          this.logger.info(`正在搜索: "${query}"`);
          
          // 使用适配器搜索记忆
          const results = await this.adapter.searchMemories(query, limit);
          
          this.logger.info(`找到 ${results.length} 条记忆`);
          
          return results.map((memory: Memory) => ({
            content: memory.content,
            timestamp: memory.timestamp,
            similarity: memory.similarity
          }));
        } catch (error) {
          this.logger.error('搜索记忆失败', error);
          throw error;
        }
      }
    };
  }

  /**
   * 创建添加记忆工具
   */
  private createAddMemoryToolRegistration(): ToolRegistration {
    return {
      name: 'add_memory',
      description: '添加内容到记忆库',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: '要添加的内容'
          },
          importance: {
            type: 'integer',
            description: '重要性等级 (1-10)'
          },
          type: {
            type: 'string',
            description: '记忆类型',
            enum: ['fact', 'experience', 'concept', 'procedure', 'other']
          }
        },
        required: ['content']
      },
      handler: async (args) => {
        const { content, importance = 5, type = 'fact' } = args;
        
        try {
          const contentPreview = content.length > 50 
            ? `${content.substring(0, 50)}...` 
            : content;
          
          this.logger.info(`添加记忆: "${contentPreview}"`);
          this.logger.debug(`记忆类型: ${type}, 重要性: ${importance}`);
          
          // 创建内存输入对象
          const memoryInput: CreateMemoryInput = {
            content,
            importance,
            type
          };
          
          // 使用适配器添加记忆
          const result = await this.adapter.addMemory(memoryInput);
          
          return { success: true, id: result.id };
        } catch (error) {
          this.logger.error('添加记忆失败', error);
          throw error;
        }
      }
    };
  }

  /**
   * 创建网络搜索工具
   */
  private createWebSearchToolRegistration(): ToolRegistration {
    return {
      name: 'web_search',
      description: '通过网络搜索获取实时信息',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索内容'
          },
          limit: {
            type: 'integer',
            description: '结果数量上限'
          }
        },
        required: ['query']
      },
      handler: async (args) => {
        // 这是一个示例实现，实际项目中可能需要接入真实的搜索API
        const query = args.query;
        const limit = args.limit || 3;
        
        this.logger.info(`执行网络搜索: "${query}"`);
        
        try {
          // 这里可以接入实际的搜索API
          return {
            message: `网络搜索功能尚未实现，您搜索的是: ${query}，限制为 ${limit} 条结果`
          };
        } catch (error) {
          this.logger.error('网络搜索失败', error);
          throw error;
        }
      }
    };
  }
} 