import { ReactNode } from 'react';

interface DesktopLayoutProps {
  children: ReactNode;
}

/**
 * 桌面端布局组件
 * 包含顶部导航栏、侧边栏和主内容区
 */
export default function DesktopLayout({ children }: DesktopLayoutProps) {
  return (
    <div className="layout desktop-layout">
      <header className="header">
        <div className="logo">AgentKai</div>
        <nav className="main-nav">
          <a href="/#/" className="nav-item">聊天</a>
          <a href="/#/memories" className="nav-item">记忆</a>
          <a href="/#/goals" className="nav-item">目标</a>
          <a href="/#/settings" className="nav-item">设置</a>
        </nav>
        <div className="user-actions">
          <button className="user-btn">用户</button>
        </div>
      </header>
      
      <div className="content-wrapper">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3>对话</h3>
            <button className="new-chat-btn">新建</button>
          </div>
          <div className="conversation-list">
            {/* 对话列表将在实际实现中渲染 */}
            <div className="conversation-item active">最新对话</div>
            <div className="conversation-item">昨天的对话</div>
            <div className="conversation-item">关于项目的对话</div>
          </div>
        </aside>
        
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
} 