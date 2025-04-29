import React from 'react';
import { Layout, Card, List, Typography } from 'antd';
import { Goal, Memory } from '@agentkai/core';
import { Link, useLocation } from 'react-router-dom';

const { Sider } = Layout;
const { Paragraph } = Typography;

interface ChatSidebarProps {
  memories: Memory[];
  goals: Goal[];
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ memories, goals, collapsed, onCollapse }) => {
  const location = useLocation();
  const isMemoryPage = location.pathname === '/memories';
  const isGoalPage = location.pathname === '/goals';
  
  const renderMemoryItem = (memory: Memory) => {
    const category = memory.metadata?.category as string | undefined;
    const importance = memory.metadata?.importance as number | undefined;

    return (
      <List.Item>
        <div className="w-full">
          <Paragraph ellipsis={{ rows: 2 }}>{memory.content}</Paragraph>
          <div className="flex items-center">
            {category && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded mr-2">
                {category}
              </span>
            )}
            {importance && importance > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                重要性 {importance}
              </span>
            )}
          </div>
        </div>
      </List.Item>
    );
  };

  return (
    <Sider 
      width={300} 
      collapsed={collapsed} 
      onCollapse={onCollapse}
      theme="light"
    >
      <div className="p-4">
        <Card 
          title="记忆" 
          size="small" 
          className={`mb-4 ${isMemoryPage ? 'border-blue-500' : ''}`}
          extra={
            <Link to="/memories" className="text-xs">查看全部</Link>
          }
        >
          <List
            size="small"
            dataSource={memories.slice(0, 5)}
            renderItem={renderMemoryItem}
            locale={{ emptyText: "暂无记忆" }}
          />
        </Card>
        
        <Card 
          title="目标" 
          size="small"
          className={isGoalPage ? 'border-blue-500' : ''}
          extra={
            <Link to="/goals" className="text-xs">查看全部</Link>
          }
        >
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
  );
}; 