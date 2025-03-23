import { useState, useCallback, useEffect } from 'react';
import { AgentService } from '../services/agent/AgentService';
import { Message } from '../models/Message';

/**
 * 聊天Hook - 连接业务逻辑层和表现层
 * 提供聊天相关的状态和方法
 */
export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const agentService = AgentService.getInstance();
  
  // 加载历史消息
  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const history = await agentService.getMessageHistory();
      setMessages(history);
      
      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载消息失败';
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);
  
  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 创建用户消息并添加到消息列表
      const userMessage: Message = {
        id: `user_${Date.now()}`,
        content,
        isAgent: false,
        timestamp: new Date(),
        status: 'sending'
      };
      
      // 先添加用户消息
      setMessages(prev => [...prev, userMessage]);
      
      // 发送消息到AI系统并获取回复
      const agentMessage = await agentService.sendMessage(content);
      
      // 更新用户消息状态为已发送
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'sent' } 
            : msg
        )
      );
      
      // 添加AI回复
      setMessages(prev => [...prev, agentMessage]);
      
      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发送消息失败';
      setError(errorMessage);
      setIsLoading(false);
      
      // 更新用户消息状态为错误
      setMessages(prev => 
        prev.map(msg => 
          msg.id === `user_${Date.now()}` 
            ? { ...msg, status: 'error', error: errorMessage } 
            : msg
        )
      );
    }
  }, []);
  
  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);
  
  // 初始化加载消息
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);
  
  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    loadMessages
  };
} 