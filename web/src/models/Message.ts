/**
 * 聊天消息模型
 */
export interface Message {
  /**
   * 消息唯一标识
   */
  id: string;
  
  /**
   * 消息内容
   */
  content: string;
  
  /**
   * 是否为AI助手消息
   */
  isAgent: boolean;
  
  /**
   * 消息发送时间
   */
  timestamp: Date;
  
  /**
   * 消息状态（可选）
   * - sending: 发送中
   * - sent: 已发送
   * - error: 发送失败
   */
  status?: 'sending' | 'sent' | 'error';
  
  /**
   * 错误信息（可选，当status为error时有效）
   */
  error?: string;
} 