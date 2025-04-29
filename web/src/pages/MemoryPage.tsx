import React, { useEffect } from 'react';
import { Layout, Typography } from 'antd';
import { MemoryList } from '../components/MemoryList';
import { useChatStore } from '../store/chatStore';

const { Content } = Layout;
const { Title } = Typography;

/**
 * 记忆管理页面
 * 集成记忆相关组件和功能
 * 使用与ChatSidebar相同的数据源
 */
export const MemoryPage: React.FC = () => {
  const { memories, loadMemories } = useChatStore();
  
  useEffect(() => {
    // 确保页面加载时获取最新的记忆数据
    loadMemories();
  }, [loadMemories]);
  
  return (
    <Layout style={{ height: '100%' }}>
      <Content style={{ padding: '24px' }}>
        <Title level={3} style={{ marginBottom: '24px' }}>
          AI记忆管理
        </Title>
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)'
        }}>
          <MemoryList initialMemories={memories} />
        </div>
      </Content>
    </Layout>
  );
}; 