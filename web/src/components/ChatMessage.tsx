import { Avatar, Typography } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { Message } from '../services/AgentService';
import { marked } from 'marked';
import 'highlight.js/styles/github.css';
import hljs from 'highlight.js';
import '../markdown.css';
import { useEffect, useRef } from 'react';

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
  message: Message;
  isStreaming?: boolean;
}

export const ChatMessage = ({ message, isStreaming = false }: ChatMessageProps) => {
  const isUser = !message.isAgent;
  const renderedContent = marked.parse(message.content);
  const messageRef = useRef<HTMLDivElement>(null);

  // 当消息内容更新时，自动滚动到底部
  useEffect(() => {
    if (messageRef.current && !isUser) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [message.content, isUser]);

  return (
    <div 
      ref={messageRef}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-[75%]`}>
        <Avatar
          icon={isUser ? <UserOutlined /> : <RobotOutlined />}
          className={`${isUser ? 'ml-2' : 'mr-2'} flex-shrink-0`}
          style={{ backgroundColor: isUser ? '#1677ff' : '#52c41a' }}
        />
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}>
          <div
            className={`p-3 rounded-lg break-words overflow-hidden ${
              isUser ? 'bg-blue-100 text-right' : 'bg-gray-100'
            } ${isStreaming ? 'animate-pulse' : ''}`}
            style={{ wordBreak: 'break-word' }}
          >
            <div 
              className="markdown-body overflow-auto" 
              dangerouslySetInnerHTML={{ __html: renderedContent }} 
            />
          </div>
          <Text type="secondary" className="text-xs mt-1">
            {message.timestamp?.toLocaleTimeString?.()}
          </Text>
        </div>
      </div>
    </div>
  );
}; 