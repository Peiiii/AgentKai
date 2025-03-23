import { ReactNode, useState } from 'react';

interface MobileLayoutProps {
  children: ReactNode;
}

/**
 * 移动端布局组件
 * 包含顶部导航栏、抽屉菜单和底部导航
 */
export default function MobileLayout({ children }: MobileLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };
  
  return (
    <div className="layout mobile-layout">
      <header className="header">
        <button 
          className="menu-btn" 
          onClick={toggleDrawer}
          aria-label={isDrawerOpen ? "关闭菜单" : "打开菜单"}
        >
          <div className={`hamburger ${isDrawerOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
        <div className="logo">AgentKai</div>
        <div className="actions">
          <button className="user-btn">用户</button>
        </div>
      </header>
      
      {/* 侧边抽屉菜单 */}
      <div className={`drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>对话</h3>
          <button className="new-chat-btn">新建</button>
        </div>
        <div className="conversation-list">
          <div className="conversation-item active">最新对话</div>
          <div className="conversation-item">昨天的对话</div>
          <div className="conversation-item">关于项目的对话</div>
        </div>
        <div className="drawer-footer">
          <button className="close-drawer" onClick={toggleDrawer}>关闭</button>
        </div>
      </div>
      
      {/* 点击遮罩关闭抽屉 */}
      {isDrawerOpen && (
        <div className="drawer-overlay" onClick={toggleDrawer}></div>
      )}
      
      <main className="main-content">
        {children}
      </main>
      
      <nav className="bottom-nav">
        <a href="/#/" className="nav-item active">
          <span className="icon">💬</span>
          <span className="label">聊天</span>
        </a>
        <a href="/#/memories" className="nav-item">
          <span className="icon">🧠</span>
          <span className="label">记忆</span>
        </a>
        <a href="/#/goals" className="nav-item">
          <span className="icon">🎯</span>
          <span className="label">目标</span>
        </a>
        <a href="/#/settings" className="nav-item">
          <span className="icon">⚙️</span>
          <span className="label">设置</span>
        </a>
      </nav>
    </div>
  );
} 