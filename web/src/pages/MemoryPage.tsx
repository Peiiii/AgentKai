import { Layout, Typography } from 'antd';
import React from 'react';
import { MemoryList } from '../components/MemoryList';

const { Content } = Layout;
const { Title } = Typography;

/**
 * 记忆管理页面
 * 集成记忆相关组件和功能
 * 使用与ChatSidebar相同的数据源
 */
export const MemoryPage: React.FC = () => {
    return (
        <Layout style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Content
                style={{
                    padding: '24px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: '1 1 auto',
                    overflow: 'hidden',
                }}
            >
                <Title
                    level={3}
                    style={{ marginBottom: '24px', flex: '0 0 auto', padding: '0 24px' }}
                >
                    AI记忆管理
                </Title>
                <div style={{ flex: '1 1 auto', overflow: 'auto' }}>
                    <div
                        style={{
                            background: '#fff',
                            padding: '24px',
                            margin: '0 24px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)',
                            flex: '1 1 auto',
                            overflow: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <MemoryList />
                    </div>
                </div>
            </Content>
        </Layout>
    );
};
