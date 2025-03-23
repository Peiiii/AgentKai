import { Avatar, Typography } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { Message } from '../services/AgentService';
import { marked } from 'marked';
import 'highlight.js/styles/github.css';
import hljs from 'highlight.js';
import '../markdown.css';

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
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = !message.isAgent;
  const renderedContent = marked.parse(message.content);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-3/4`}>
        <Avatar
          icon={isUser ? <UserOutlined /> : <RobotOutlined />}
          className={`${isUser ? 'ml-2' : 'mr-2'}`}
          style={{ backgroundColor: isUser ? '#1677ff' : '#52c41a' }}
        />
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div
            className={`p-3 rounded-lg ${
              isUser ? 'bg-blue-100 text-right' : 'bg-gray-100'
            }`}
          >
            <div 
              className="markdown-body" 
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