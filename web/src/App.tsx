import { useState, useEffect, useRef } from 'react';
import { Layout, Spin, notification } from 'antd';
import { App as AntApp } from 'antd';
import { AgentService } from './services/AgentService';
import { useChatStore } from './store/chatStore';
import { ChatMessage } from './components/ChatMessage';
import { ChatHeader } from './components/ChatHeader';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatInput } from './components/ChatInput';

const { Content } = Layout;

// 主聊天应用组件
function ChatApp() {
  const [inputValue, setInputValue] = useState('');
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    messages, 
    memories, 
    goals,
    isLoading,
    error,
    sendMessage,
    loadMessageHistory,
    loadMemories,
    setGoals 
  } = useChatStore();

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 当消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化数据
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const agentService = AgentService.getInstance();
        await agentService.initialize();
        
        await loadMemories();
        const fetchedGoals = await agentService.getGoals();
        setGoals(fetchedGoals);
        await loadMessageHistory();
      } catch (error) {
        console.error('Failed to load initial data:', error);
        notification.error({
          message: '加载失败',
          description: '无法加载初始数据，请稍后再试。'
        });
      }
    };
    
    loadInitialData();
  }, [loadMemories, setGoals, loadMessageHistory]);

  // 显示错误提示
  useEffect(() => {
    if (error) {
      notification.error({
        message: '操作失败',
        description: error
      });
    }
  }, [error]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const content = inputValue.trim();
    setInputValue('');
    await sendMessage(content);
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <ChatHeader />
      <Layout>
        <ChatSidebar 
          memories={memories}
          goals={goals}
          collapsed={siderCollapsed}
          onCollapse={setSiderCollapsed}
        />
        <Content className="bg-gray-50">
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto p-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-400">
                    <p>发送消息开始与AI助手对话</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(message => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
              
              {isLoading && (
                <div className="flex justify-center my-4">
                  <Spin tip="正在思考..." />
                </div>
              )}
            </div>
            
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

// 包装应用以使用 Ant Design 的样式上下文
function App() {
  return (
    <AntApp>
      <ChatApp />
    </AntApp>
  );
}

export default App;
