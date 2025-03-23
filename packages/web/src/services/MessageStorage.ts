import { BrowserStorage } from './BrowserStorage';
import { Message } from './AgentService';

/**
 * 消息存储服务类
 * 负责消息的持久化存储和检索
 */
export class MessageStorage {
  private static instance: MessageStorage;
  private storage: BrowserStorage<Message>;
  private initialized = false;

  /**
   * 创建消息存储实例
   * 使用私有构造函数实现单例模式
   */
  private constructor() {
    this.storage = new BrowserStorage<Message>('/storage', 'messages');
  }

  /**
   * 获取MessageStorage实例
   */
  public static getInstance(): MessageStorage {
    if (!MessageStorage.instance) {
      MessageStorage.instance = new MessageStorage();
    }
    return MessageStorage.instance;
  }

  /**
   * 初始化消息存储
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.storage.initialize();
      this.initialized = true;
      console.log('MessageStorage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MessageStorage:', error);
      throw error;
    }
  }

  /**
   * 保存消息
   * @param message 要保存的消息
   * @returns 保存的消息
   */
  public async saveMessage(message: Message): Promise<Message> {
    return this.storage.save(message);
  }

  /**
   * 保存多条消息
   * @param messages 消息数组
   * @returns 保存的消息数组
   */
  public async saveMessages(messages: Message[]): Promise<Message[]> {
    return this.storage.saveMany(messages);
  }

  /**
   * 获取消息
   * @param id 消息ID
   * @returns 消息或null（如果不存在）
   */
  public async getMessage(id: string): Promise<Message | null> {
    return this.storage.get(id);
  }

  /**
   * 获取所有消息
   * @returns 消息数组
   */
  public async getAllMessages(): Promise<Message[]> {
    const messages = await this.storage.getAll();
    
    // 按时间戳排序，最新的在前面
    return messages.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  }

  /**
   * 删除消息
   * @param id 消息ID
   * @returns 是否成功删除
   */
  public async deleteMessage(id: string): Promise<boolean> {
    return this.storage.delete(id);
  }

  /**
   * 清空所有消息
   * @returns 是否成功清空
   */
  public async clearMessages(): Promise<boolean> {
    return this.storage.clear();
  }
} 