import { useState, useEffect } from 'react';
import { Input, Button, List, Card, Spin, notification, Layout, Typography } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { App as AntApp } from 'antd';
import { AgentService } from './services/AgentService';
import { useChatStore } from './store/chatStore';
import { ChatMessage } from './components/ChatMessage';
import { Memory } from './components/MemoryCard';

const { Header, Content, Sider } = Layout;
const { Title, Paragraph } = Typography;

// 主聊天应用组件
function ChatApp() {
  const [inputValue, setInputValue] = useState('');
  const [siderCollapsed, setSiderCollapsed] = useState(false);
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

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 初始化AgentService
        const agentService = AgentService.getInstance()
        await agentService.initialize()
        
        // 加载记忆和目标
        await loadMemories();
        const fetchedGoals = await agentService.getGoals()
        
        setGoals(fetchedGoals)
        
        // 加载消息历史
        await loadMessageHistory()
      } catch (error) {
        console.error('Failed to load initial data:', error)
        notification.error({
          message: '加载失败',
          description: '无法加载初始数据，请稍后再试。'
        })
      }
    }
    
    loadInitialData()
  }, [loadMemories, setGoals, loadMessageHistory])

  // 显示错误提示
  useEffect(() => {
    if (error) {
      notification.error({
        message: '操作失败',
        description: error
      })
    }
  }, [error])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return
    
    const content = inputValue.trim()
    setInputValue('')
    
    // 使用store中的sendMessage函数
    await sendMessage(content)
  }

  // 渲染记忆项
  const renderMemoryItem = (memory: Memory) => {
    return (
      <List.Item>
        <div className="w-full">
          <Paragraph ellipsis={{ rows: 2 }}>{memory.content}</Paragraph>
          <div className="flex items-center">
            {memory.category && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded mr-2">
                {memory.category}
              </span>
            )}
            {memory.importance && memory.importance > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                重要性 {memory.importance}
              </span>
            )}
          </div>
        </div>
      </List.Item>
    );
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Header className="flex items-center" style={{ padding: '0 20px' }}>
        <Title level={3} style={{ color: 'white', margin: 0 }}>AgentKai 智能助手</Title>
      </Header>
      <Layout>
        <Sider 
          width={300} 
          collapsible 
          collapsed={siderCollapsed} 
          onCollapse={setSiderCollapsed}
          theme="light"
        >
          <div className="p-4">
            <Card 
              title="记忆" 
              size="small" 
              className="mb-4"
              extra={
                <a href="/memories" className="text-xs">查看全部</a>
              }
            >
              <List
                size="small"
                dataSource={memories.slice(0, 5)}
                renderItem={renderMemoryItem}
                locale={{ emptyText: "暂无记忆" }}
              />
            </Card>
            
            <Card title="目标" size="small">
              <List
                size="small"
                dataSource={goals}
                renderItem={goal => (
                  <List.Item>
                    <div className="w-full">
                      <Paragraph ellipsis={{ rows: 1 }}>{goal.description}</Paragraph>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full" 
                          style={{ width: `${goal.progress * 100}%` }} 
                        />
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </div>
        </Sider>
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
                </div>
              )}
              
              {isLoading && (
                <div className="flex justify-center my-4">
                  <Spin tip="正在思考..." />
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onPressEnter={handleSendMessage}
                  placeholder="输入消息..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  type="primary" 
                  icon={<SendOutlined />} 
                  onClick={handleSendMessage}
                  loading={isLoading}
                  className="ml-2"
                >
                  发送
                </Button>
              </div>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

// 包装应用以使用 Ant Design 的样式上下文
function App() {
  return (
    <AntApp>
      <ChatApp />
    </AntApp>
  )
}

export default App
