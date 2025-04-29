import { Avatar, Typography, Button, Tag } from 'antd';
import { UserOutlined, RobotOutlined, ToolOutlined, CheckCircleOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import { marked } from 'marked';
import 'highlight.js/styles/github.css';
import hljs from 'highlight.js';
import '../markdown.css';
import { useEffect, useRef, useState } from 'react';
import { Message } from '../types/message';
import type { TextUIPart, UIMessage, UIPart, ToolInvocation } from '@agentkai/core';

const { Text } = Typography;

// 配置marked使用highlight.js进行代码高亮
marked.setOptions({
  // @ts-expect-error: Marked类型定义可能不完整
  highlight: function(code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true
});

interface ChatMessageProps {
  message: Message | UIMessage;
  isStreaming?: boolean;
}

type MessageContent = string | Array<TextUIPart | { type: string; text?: string }>;

// 消息内容渲染组件
const MessageContentRenderer = ({ content, isStreaming }: { content: MessageContent, isStreaming: boolean }) => {
  const contentToRender = Array.isArray(content) 
    ? content.map(part => {
        if (typeof part === 'string') return part;
        if (part.type === 'text') return part.text || '';
        return JSON.stringify(part);
      }).join('')
    : content || '';
    
  const renderedContent = marked.parse(contentToRender);
  
  return (
    <div 
      className={`markdown-body overflow-auto ${isStreaming ? 'animate-pulse' : ''}`}
      dangerouslySetInnerHTML={{ __html: renderedContent }} 
    />
  );
};

// 工具调用结果渲染组件
const ToolResultRenderer = ({ result }: { result: string }) => {
  // 尝试解析结果为JSON
  let parsedResult;
  let isJSON = false;
  const [isExpanded, setIsExpanded] = useState(true);
  
  try {
    parsedResult = JSON.parse(result);
    isJSON = true;
  } catch (e) {
    parsedResult = result;
  }
  
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <CheckCircleOutlined className="mr-2 text-green-500" />
          <Text strong>执行结果</Text>
        </div>
        <Button 
          type="text" 
          size="small" 
          icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '收起' : '展开'}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="mt-1 p-2 bg-green-50 rounded border border-green-100 overflow-x-auto">
          {isJSON ? (
            <pre className="whitespace-pre-wrap break-words" style={{ maxWidth: '100%' }}>
              {JSON.stringify(parsedResult, null, 2)}
            </pre>
          ) : (
            <div className="markdown-body whitespace-pre-wrap break-words" style={{ maxWidth: '100%' }} 
              dangerouslySetInnerHTML={{ __html: marked.parse(result) }} 
            />
          )}
        </div>
      )}
    </div>
  );
};

// 提取工具参数中最重要的1-3个参数
const extractKeyParams = (args: Record<string, unknown>): {key: string, value: string}[] => {
  if (!args || typeof args !== 'object') return [];
  
  // 优先级高的参数名列表
  const priorityParams = ['query', 'id', 'name', 'content', 'input', 'text', 'value', 'url', 'search'];
  
  // 找出所有参数
  const allParams = Object.entries(args).map(([key, value]) => {
    // 格式化值为字符串
    let formattedValue = '';
    if (value === null) formattedValue = 'null';
    else if (value === undefined) formattedValue = 'undefined';
    else if (Array.isArray(value)) formattedValue = `[${value.length}项]`;
    else if (typeof value === 'object') formattedValue = '{...}';
    else if (typeof value === 'string') {
      formattedValue = value.length > 15 ? `"${value.substring(0, 12)}..."` : `"${value}"`;
    }
    else formattedValue = String(value);
    
    return { key, value: formattedValue };
  });
  
  // 按优先级排序
  const sortedParams = [...allParams].sort((a, b) => {
    const aIndex = priorityParams.indexOf(a.key);
    const bIndex = priorityParams.indexOf(b.key);
    
    if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
    if (aIndex >= 0) return -1;
    if (bIndex >= 0) return 1;
    return 0;
  });
  
  // 返回前3个参数
  return sortedParams.slice(0, 3);
};

// 从工具结果中提取状态标签
const extractResultStatus = (result: string): {text: string, color: string} => {
  try {
    const parsed = JSON.parse(result);
    
    // 处理数组
    if (Array.isArray(parsed)) {
      return { 
        text: `${parsed.length}个结果`, 
        color: parsed.length > 0 ? 'green' : 'orange' 
      };
    }
    
    // 处理对象
    if (typeof parsed === 'object' && parsed !== null) {
      // 检查常见的状态字段
      if (parsed.status) {
        const status = String(parsed.status).toLowerCase();
        if (['success', 'ok', 'completed', '成功'].includes(status)) {
          return { text: '成功', color: 'green' };
        }
        if (['error', 'failed', 'failure', '失败'].includes(status)) {
          return { text: '失败', color: 'red' };
        }
        return { text: status, color: 'blue' };
      }
      
      // 如果有id字段
      if (parsed.id) {
        return { text: `ID:${String(parsed.id).substring(0, 6)}`, color: 'cyan' };
      }
      
      // 默认显示对象
      return { text: '完成', color: 'green' };
    }
    
    // 处理字符串等其他情况
    return { text: '完成', color: 'green' };
  } catch (e) {
    // 如果不是JSON
    if (result.length <= 10) {
      return { text: result, color: 'green' };
    }
    return { text: '完成', color: 'green' };
  }
};

// 可收起的工具调用组件
const CollapsibleToolCall = ({ toolInvocation }: { toolInvocation: ToolInvocation }) => {
  // 如果是已完成的工具调用(state为result)，则默认收起
  const isCompleted = toolInvocation.state === 'result' && 'result' in toolInvocation;
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 提取关键参数标签
  const paramTags = extractKeyParams(toolInvocation.args);
  
  // 提取结果状态（如果已完成）
  const resultStatus = isCompleted ? extractResultStatus(toolInvocation.result) : null;
  
  return (
    <div className={`bg-gray-50 p-3 rounded-lg mb-2 border ${isCompleted ? 'border-green-200' : 'border-gray-200'} w-full transition-all duration-200`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-grow overflow-hidden">
          <ToolOutlined className={`mr-2 flex-shrink-0 ${isCompleted ? 'text-green-500' : 'text-blue-500'}`} />
          <div className="flex-grow min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <Text strong className="break-words">{toolInvocation.toolName}</Text>
              
              {/* 显示状态标签或参数标签 */}
              {!isExpanded && (
                <div className="flex flex-wrap gap-1">
                  {resultStatus && (
                    <Tag color={resultStatus.color} className="m-0 text-xs">
                      {resultStatus.text}
                    </Tag>
                  )}
                  
                  {paramTags.map((param, index) => (
                    <Tag key={index} color="blue" className="m-0 text-xs">
                      {param.key}: {param.value}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <Button 
          type="text" 
          size="small" 
          icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-2 flex-shrink-0"
        >
          {isExpanded ? '收起' : '展开'}
        </Button>
      </div>
      
      {isExpanded && (
        <>
          <div className="text-sm mt-2">
            <Text type="secondary">参数：</Text>
            <div className="mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
              <pre className="whitespace-pre-wrap break-words" style={{ maxWidth: '100%' }}>
                {JSON.stringify(toolInvocation.args, null, 2)}
              </pre>
            </div>
          </div>
          
          {/* 渲染工具调用结果，如果存在的话 */}
          {isCompleted && (
            <ToolResultRenderer result={toolInvocation.result} />
          )}
        </>
      )}
    </div>
  );
};

// UIMessage 内容渲染组件
const UIMessageContentRenderer = ({ parts, isStreaming }: { parts: UIPart[], isStreaming: boolean }) => {
  return (
    <div className="space-y-2 w-full">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <div key={index} className={`markdown-body overflow-auto ${isStreaming ? 'animate-pulse' : ''}`}>
              <div dangerouslySetInnerHTML={{ __html: marked.parse(part.text) }} />
            </div>
          );
        } else if (part.type === 'tool-invocation') {
          return (
            <CollapsibleToolCall key={index} toolInvocation={part.toolInvocation} />
          );
        }
        return null;
      })}
    </div>
  );
};

export const ChatMessage = ({ message, isStreaming = false }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const messageRef = useRef<HTMLDivElement>(null);
  const isUIMessage = 'parts' in message && Array.isArray(message.parts);

  // 当消息内容更新时，自动滚动到底部
  useEffect(() => {
    if (messageRef.current && !isUser) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isUser, isUIMessage ? message.parts : message.content]);

  const getAvatarIcon = () => {
    switch (message.role) {
      case 'user':
        return <UserOutlined />;
      case 'assistant':
        return <RobotOutlined />;
      case 'tool':
        return <ToolOutlined />;
      default:
        return <RobotOutlined />;
    }
  };

  const getAvatarColor = () => {
    switch (message.role) {
      case 'user':
        return '#1890ff';
      case 'assistant':
        return '#52c41a';
      case 'tool':
        return '#faad14';
      default:
        return '#52c41a';
    }
  };

  return (
    <div 
      ref={messageRef}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {!isUser && (
        <Avatar 
          icon={getAvatarIcon()} 
          style={{ backgroundColor: getAvatarColor() }} 
          className="mr-2 flex-shrink-0"
        />
      )}
      <div className={`max-w-[80%] ${isUser ? 'bg-blue-50' : 'bg-white'} p-4 rounded-lg shadow-sm overflow-hidden`}>
        {isUIMessage ? (
          <UIMessageContentRenderer parts={message.parts} isStreaming={isStreaming} />
        ) : (
          <MessageContentRenderer 
            content={message.content as MessageContent} 
            isStreaming={isStreaming} 
          />
        )}
      </div>
      {isUser && (
        <Avatar 
          icon={<UserOutlined />} 
          style={{ backgroundColor: '#1890ff' }} 
          className="ml-2 flex-shrink-0"
        />
      )}
    </div>
  );
};