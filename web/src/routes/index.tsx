import React from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { 
  MessageOutlined, 
  BookOutlined, 
  CompassOutlined,
  SettingOutlined 
} from '@ant-design/icons';
import App from '../App';
import { MemoryPage } from '../pages/MemoryPage';

const { Sider, Content } = Layout;

/**
 * 主导航组件
 * 包含侧边栏和主内容区
 */
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const navigate = useNavigate();

  const menuItems = [
    {
      key: '/',
      icon: <MessageOutlined />,
      label: '聊天',
    },
    {
      key: '/memories',
      icon: <BookOutlined />,
      label: '记忆',
    },
    {
      key: '/goals',
      icon: <CompassOutlined />,
      label: '目标',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
      >
        <div className="demo-logo-vertical" style={{ height: '64px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <h2 style={{ color: '#1890ff', margin: 0 }}>
            {collapsed ? 'AK' : 'AgentKai'}
          </h2>
        </div>
        <Menu 
          theme="light" 
          defaultSelectedKeys={['/']} 
          mode="inline"
          items={menuItems}
          onClick={({ key }) => {
            navigate(key);
          }}
        />
      </Sider>
      <Layout>
        <Content style={{ margin: '0' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

/**
 * 路由配置组件
 * 定义应用的路由规则
 */
export const AppRoutes: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={
          <MainLayout>
            <App />
          </MainLayout>
        } />
        <Route path="/memories" element={
          <MainLayout>
            <MemoryPage />
          </MainLayout>
        } />
        <Route path="/goals" element={
          <MainLayout>
            <div>目标页面开发中...</div>
          </MainLayout>
        } />
        <Route path="/settings" element={
          <MainLayout>
            <div>设置页面开发中...</div>
          </MainLayout>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}; 