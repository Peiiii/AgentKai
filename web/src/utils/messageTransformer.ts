import { TextUIPart, ToolInvocation, ToolInvocationUIPart, UIMessage, UIPart } from '@agentkai/core';
import { Message } from '../types/message';

/**
 * 将普通 Message 转换为 UIMessage
 * @param message 普通消息
 * @returns UIMessage 格式的消息
 */
export const transformMessageToUIMessage = (message: Message): UIMessage => {
  // 创建基本部分
  const parts: UIPart[] = [];
  
  // 添加文本部分
  if (message.content) {
    parts.push({
      type: 'text',
      text: typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
    } as TextUIPart);
  }
  
  // 添加工具调用部分
  if ('tool_calls' in message && message.tool_calls && message.tool_calls.length > 0) {
    message.tool_calls.forEach(toolCall => {
      parts.push({
        type: 'tool-invocation',
        toolInvocation: {
          state: 'call',
          toolCallId: toolCall.id,
          toolName: toolCall.function?.name || 'unknown',
          args: toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {}
        }
      } as ToolInvocationUIPart);
    });
  }
  
  // 返回 UIMessage
  return {
    id: message.id || `msg_${Date.now()}`,
    content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
    role: message.role,
    parts
  } as UIMessage;
};

/**
 * 将 Message 列表转换为 UIMessage 列表，根据 messageGroupId 聚合
 * @param messages 普通消息列表
 * @returns UIMessage 列表
 */
export const transformMessagesToUIMessages = (messages: Message[]): UIMessage[] => {
  // 按 messageGroupId 分组
  const messageGroups = new Map<string, Message[]>();
  
  messages.forEach(message => {
    const groupId = message.messageGroupId || message.id || `msg_${Date.now()}`;
    if (!messageGroups.has(groupId)) {
      messageGroups.set(groupId, []);
    }
    messageGroups.get(groupId)?.push(message);
  });
  
  // 将每组消息转换为一个 UIMessage
  return Array.from(messageGroups.values()).map(group => {
    // 使用组内第一条消息作为基础
    const baseMessage = group[0];
    
    // 创建基本部分
    const parts: UIPart[] = [];
    
    // 保存工具调用和工具结果的映射，用于后续匹配
    type ToolCallData = {
      toolCall: Omit<ToolInvocation, 'state'> & { state: 'call' },
      result?: string
    };
    const toolCallMap = new Map<string, ToolCallData>();
    
    // 第一轮：收集所有工具调用和结果
    group.forEach(message => {
      // 收集工具调用
      if ('tool_calls' in message && message.tool_calls && message.tool_calls.length > 0) {
        message.tool_calls.forEach(toolCall => {
          toolCallMap.set(toolCall.id, { 
            toolCall: {
              state: 'call',
              toolCallId: toolCall.id,
              toolName: toolCall.function?.name || 'unknown',
              args: toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {}
            }
          });
        });
      }
      
      // 收集工具结果
      if (message.role === 'tool' && message.tool_call_id && message.content) {
        const toolCallData = toolCallMap.get(message.tool_call_id);
        if (toolCallData) {
          toolCallData.result = typeof message.content === 'string' 
            ? message.content 
            : JSON.stringify(message.content);
        }
      }
    });
    
    // 第二轮：处理所有消息，生成 UI 部分
    group.forEach(message => {
      // 添加文本部分（只有非工具消息才添加文本部分）
      if (message.content && message.role !== 'tool') {
        parts.push({
          type: 'text',
          text: typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
        } as TextUIPart);
      }
      
      // 添加工具调用部分，只处理未处理过的工具调用
      if ('tool_calls' in message && message.tool_calls && message.tool_calls.length > 0) {
        message.tool_calls.forEach(toolCall => {
          const toolCallData = toolCallMap.get(toolCall.id);
          if (toolCallData) {
            // 如果有结果，则添加带结果的工具调用
            if (toolCallData.result) {
              parts.push({
                type: 'tool-invocation',
                toolInvocation: {
                  state: 'result',
                  toolCallId: toolCall.id,
                  toolName: toolCall.function?.name || 'unknown',
                  args: toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {},
                  result: toolCallData.result
                }
              } as ToolInvocationUIPart);
              
              // 标记为已处理，避免重复添加
              toolCallMap.delete(toolCall.id);
            } else {
              // 如果没有结果，且尚未添加，则添加工具调用
              parts.push({
                type: 'tool-invocation',
                toolInvocation: {
                  state: 'call',
                  toolCallId: toolCall.id,
                  toolName: toolCall.function?.name || 'unknown',
                  args: toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {}
                }
              } as ToolInvocationUIPart);
              
              // 标记为已处理，避免重复添加
              toolCallMap.delete(toolCall.id);
            }
          }
        });
      }
    });
    
    // 返回 UIMessage
    return {
      id: baseMessage.id || `msg_${Date.now()}`,
      content: typeof baseMessage.content === 'string' ? baseMessage.content : JSON.stringify(baseMessage.content),
      role: baseMessage.role,
      parts
    } as UIMessage;
  });
};

/**
 * 将 Message 列表转换为 UIMessage 列表，不进行聚合
 * @param messages 普通消息列表
 * @returns UIMessage 列表
 */
export const transformMessagesToUIMessagesWithoutGrouping = (messages: Message[]): UIMessage[] => {
  return messages.map(transformMessageToUIMessage);
}; 