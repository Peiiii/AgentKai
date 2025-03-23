import React from 'react';
import { Layout, Typography } from 'antd';
import { MemoryList } from '../components/MemoryList';

const { Content } = Layout;
const { Title } = Typography;

/**
 * 记忆管理页面
 * 集成记忆相关组件和功能
 */
export const MemoryPage: React.FC = () => {
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
          <MemoryList />
        </div>
      </Content>
    </Layout>
  );
}; 