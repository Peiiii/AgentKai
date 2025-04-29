import { Memory, MemoryType } from '@agentkai/core';
import { App as AntApp, Layout, Spin, notification } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatInput } from './components/ChatInput';
import { ChatMessage } from './components/ChatMessage';
import { ChatSidebar } from './components/ChatSidebar';
import { AgentService } from './services/AgentService';
import { useChatStore } from './store/chatStore';
import { Tool } from './types/tool';
import { transformMessagesToUIMessages } from './utils/messageTransformer';

const { Content } = Layout;

// 定义可用工具
const availableTools: Tool<{ query: string }, Memory[]>[] = [
    {
        name: 'search_memories',
        description: '搜索记忆库中的内容',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: '搜索关键词'
                }
            },
            required: ['query']
        },
        handler: async (args: { query: string }) => {
            const api = await import('./api/agent').then(m => m.AgentAPI.getInstance());
            const memories = await api.getMemories();
            return memories.filter(m => m.content.includes(args.query));
        }
    }
];

// 定义记忆工具
const memoryTools: Tool<{ content: string; importance?: number }, Memory>[] = [
    {
        name: 'add_memory',
        description: '添加新的记忆',
        parameters: {
            type: 'object',
            properties: {
                content: {
                    type: 'string',
                    description: '记忆内容'
                },
                importance: {
                    type: 'number',
                    description: '重要性（1-10）'
                }
            },
            required: ['content']
        },
        handler: async (args: { content: string; importance?: number }) => {
            const newMemory: Memory = {
                id: `memory_${Date.now()}`,
                content: args.content,
                type: MemoryType.OBSERVATION,
                createdAt: Date.now(),
                metadata: {
                    importance: args.importance || 5
                }
            };
            return newMemory;
        }
    }
];

// 合并所有工具
const allTools = [...availableTools, ...memoryTools] as Tool<unknown, unknown>[];

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
        sendMessageWithTools,
        loadMessageHistory,
        loadMemories,
        setGoals 
    } = useChatStore();

    // 使用 useMemo 转换消息为 UIMessage
    const uiMessages = useMemo(() => {
        const _uiMessages = transformMessagesToUIMessages(messages);
        console.log("[ChatApp] transformMessagesToUIMessages", "messages", messages, "uiMessages", _uiMessages);
        return _uiMessages;
    }, [messages]);


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
        
        // 使用带工具支持的流式输出
        await sendMessageWithTools(content, allTools);
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
                            {uiMessages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center text-gray-400">
                                        <p>发送消息开始与AI助手对话</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {uiMessages.map(message => (
                                        <ChatMessage 
                                            key={message.id} 
                                            message={message}
                                        />
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
