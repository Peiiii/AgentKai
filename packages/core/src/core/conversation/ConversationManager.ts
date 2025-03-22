import { Logger } from '../../utils/logger';

/**
 * 会话消息结构
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

/**
 * 会话管理器
 * 负责管理对话历史，支持限制历史记录长度，添加和清理消息等功能
 */
export class ConversationManager {
  private history: ConversationMessage[] = [];
  private maxHistoryLength: number;
  private logger: Logger;

  /**
   * 构造函数
   * @param maxHistoryLength 最大历史记录长度
   */
  constructor(maxHistoryLength: number = 10) {
    this.maxHistoryLength = maxHistoryLength;
    this.logger = new Logger('ConversationManager');
    this.logger.info(`初始化会话管理器，最大历史长度: ${maxHistoryLength}`);
  }

  /**
   * 添加消息到历史记录
   * @param role 角色
   * @param content 内容
   * @param timestamp 时间戳
   */
  addMessage(role: 'user' | 'assistant' | 'system', content: string, timestamp: number = Date.now()): void {
    this.history.push({ role, content, timestamp });
    
    // 如果超过最大长度，裁剪历史记录
    if (this.history.length > this.maxHistoryLength) {
      this.history = this.history.slice(-this.maxHistoryLength);
      this.logger.debug(`历史记录超出最大长度，已裁剪至${this.maxHistoryLength}条`);
    }
  }

  /**
   * 获取完整历史记录
   */
  getHistory(): ConversationMessage[] {
    return [...this.history];
  }
  
  /**
   * 获取最近n条历史记录
   * @param count 获取数量
   */
  getRecentHistory(count: number): ConversationMessage[] {
    return this.history.slice(-Math.min(count, this.history.length));
  }
  
  /**
   * 获取指定角色的历史记录
   * @param role 角色
   */
  getHistoryByRole(role: 'user' | 'assistant' | 'system'): ConversationMessage[] {
    return this.history.filter(msg => msg.role === role);
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.history = [];
    this.logger.info('历史记录已清空');
  }
  
  /**
   * 获取历史记录长度
   */
  getHistoryLength(): number {
    return this.history.length;
  }
  
  /**
   * 设置最大历史记录长度
   * @param length 最大长度
   */
  setMaxHistoryLength(length: number): void {
    if (length < 1) {
      this.logger.warn('最大历史长度不能小于1，设置失败');
      return;
    }
    
    this.maxHistoryLength = length;
    
    // 如果当前历史长度超过新设置的最大长度，裁剪历史记录
    if (this.history.length > this.maxHistoryLength) {
      this.history = this.history.slice(-this.maxHistoryLength);
      this.logger.info(`最大历史长度已更新为${length}，历史记录已裁剪`);
    } else {
      this.logger.info(`最大历史长度已更新为${length}`);
    }
  }
} 