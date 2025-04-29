import { Memory } from '@agentkai/core';
import { AgentAPI } from '../../api/agent';
import { Message } from '../../types/message';

// 定义一个接口来替代any类型
interface Conversation {
  id?: string;
  messages?: Message[];
}

/**
 * 业务逻辑层 - AgentService
 * 处理与AI助手相关的业务逻辑
 */
export class AgentService {
  private static instance: AgentService | null = null;
  private agentAPI: AgentAPI;

  private constructor() {
    this.agentAPI = AgentAPI.getInstance();
  }

  /**
   * 获取AgentService单例
   */
  public static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  /**
   * 初始化代理服务
   */
  public async initialize(): Promise<void> {
    await this.agentAPI.initialize();
  }

  /**
   * 发送消息并获取回复
   * @param content 用户消息内容
   * @returns AI回复的消息对象
   */
  public async sendMessage(content: string): Promise<Message> {
    // 创建用户消息（这里只是创建，但目前未使用，后续可作为返回值或存储）
    // 也可以删除这部分代码，如果后续不需要使用
    // const userMessage: Message = {
    //   id: `user_${Date.now()}`,
    //   content,
    //   isAgent: false,
    //   timestamp: new Date(),
    //   status: 'sent'
    // };
    
    // 处理业务逻辑（如消息格式化、用户偏好应用等）
    const formattedContent = this.formatMessage(content);
    
    try {
      // 调用数据访问层
      const response = await this.agentAPI.processMessage(formattedContent);
      
      // 创建AI回复消息
      const agentMessage: Message = {
        id: `agent_${Date.now()}`,
        content: response.content,
        role: 'assistant',
        timestamp: new Date(),
        type: 'text',
        status: 'sent'
      };
      
      return agentMessage;
    } catch (error) {
      // 处理错误情况
      const errorMessage = error instanceof Error ? error.message : '发送消息失败';
      
      // 创建错误消息
      const errorResponse: Message = {
        id: `error_${Date.now()}`,
        content: `处理消息时出错: ${errorMessage}`,
        role: 'assistant',
        timestamp: new Date(),
        type: 'text',
        status: 'error',
        error: errorMessage
      };
      
      return errorResponse;
    }
  }

  /**
   * 获取历史消息
   * 注意：此方法需要根据实际的数据结构进行调整
   */
  public async getMessageHistory(): Promise<Message[]> {
    try {
      const conversations = await this.agentAPI.getConversations();
      
      // 将原始对话数据转换为消息格式
      // 这里需要根据实际的API返回格式进行调整
      const messages: Message[] = conversations.flatMap((conversation: Conversation) => {
        if (Array.isArray(conversation.messages)) {
          return conversation.messages.map(msg => ({
            id: msg.id || `msg_${Date.now()}_${Math.random()}`,
            content: msg.content || '',
            role: msg.role as 'assistant' | 'user' | 'system' | 'tool',
            timestamp: new Date(msg.timestamp || Date.now()),
            status: 'sent',
            type: 'text'
            
          }));
        }
        return [];
      });
      
      return messages;
    } catch (error) {
      console.error('Failed to get message history:', error);
      return [];
    }
  }

  /**
   * 格式化消息内容
   * @param content 原始消息内容
   * @returns 格式化后的内容
   */
  private formatMessage(content: string): string {
    // 实际业务逻辑：格式化消息、应用用户偏好等
    return content.trim();
  }

  /**
   * 获取记忆列表
   * 从代理API获取所有记忆，并转换为UI组件所需的格式
   */
  public async getMemories(): Promise<Memory[]> {
    try {
      const agentMemories = await this.agentAPI.getMemories();
      
      // 转换为UI组件需要的Memory格式
      const memories: Memory[] = agentMemories.map(mem => ({
        id: mem.id,
        content: mem.content,
        category: mem.type,
        importance: Number(mem.metadata?.importance || 0),
        timestamp: Number(mem.createdAt),
        tags: Array.isArray(mem.metadata?.tags) ? mem.metadata.tags : []
      }));
      
      return memories;
    } catch (error) {
      console.error('Failed to get memories:', error);
      return [];
    }
  }

  /**
   * 获取目标列表
   * @returns 目标列表
   */
  public async getGoals(): Promise<{ id: string; description: string; progress: number }[]> {
    try {
      return await this.agentAPI.getGoals();
    } catch (error) {
      console.error('Failed to get goals:', error);
      return [];
    }
  }
} 