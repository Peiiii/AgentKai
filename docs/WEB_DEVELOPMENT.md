# AgentKai Web端开发文档

## 项目概述

AgentKai Web端是一个基于浏览器环境的AI代理交互界面，使用React、TypeScript和Ant Design构建。该应用允许用户与AI代理进行对话交互，并展示AI代理的记忆和目标。

## 技术栈

- **前端框架**: React 19
- **UI库**: Ant Design 5
- **状态管理**: Zustand
- **开发工具**: Vite, TypeScript
- **平台支持**: 基于@agentkai/browser库，提供浏览器环境下的平台服务

## 项目结构

```
packages/web/
├── src/
│   ├── components/       # UI组件
│   ├── hooks/            # 自定义React Hooks
│   ├── services/         # 服务层，与核心功能交互
│   ├── store/            # 状态管理
│   ├── styles/           # 样式文件
│   ├── utils/            # 工具函数
│   ├── App.tsx           # 应用入口组件
│   └── main.tsx          # 应用启动点
├── public/               # 静态资源
└── index.html            # HTML模板
```

## 核心服务

### AgentService

AgentService是Web端与AI代理核心功能交互的主要服务，负责初始化代理环境、发送用户消息和获取AI响应。

主要特性:
- 单例模式实现，确保全局只有一个实例
- 基于浏览器平台(@agentkai/browser)的文件系统和环境变量
- 提供消息发送和响应接收的接口
- 管理记忆和目标数据的访问

## 开发计划

### 阶段1: 基础架构与集成

- [x] 创建Web项目脚手架
- [x] 集成Ant Design UI库
- [x] 设计基本的聊天界面
- [x] 集成@agentkai/browser库
- [ ] 实现基本的消息发送和接收功能
- [ ] 优化错误处理和加载状态

### 阶段2: 功能增强

- [ ] 实现记忆管理界面
- [ ] 实现目标跟踪与显示
- [ ] 添加历史会话浏览功能
- [ ] 实现AI响应的富文本渲染

### 阶段3: 用户体验优化

- [ ] 优化移动端适配
- [ ] 添加主题切换功能
- [ ] 实现消息通知
- [ ] 添加导出对话功能
- [ ] 优化页面加载性能

## 浏览器平台集成指南

### 初始化浏览器平台

```typescript
import browserPlatform from '@agentkai/browser';

// 在应用启动时初始化
async function initializeApp() {
  try {
    // 确保文件系统已准备就绪
    if (!await browserPlatform.fs.exists('/')) {
      await browserPlatform.fs.mkdir('/', { recursive: true });
    }
    
    // 设置环境变量
    browserPlatform.env.set('APP_INITIALIZED', 'true');
    
    console.log('平台初始化成功');
  } catch (error) {
    console.error('平台初始化失败:', error);
  }
}
```

### 使用文件系统

```typescript
// 读取文件
async function readUserProfile() {
  try {
    if (await browserPlatform.fs.exists('/profiles/user.json')) {
      const content = await browserPlatform.fs.readFile('/profiles/user.json');
      return JSON.parse(content);
    }
    return null;
  } catch (error) {
    console.error('读取用户配置失败:', error);
    return null;
  }
}

// 写入文件
async function saveUserProfile(profile) {
  try {
    // 确保目录存在
    if (!await browserPlatform.fs.exists('/profiles')) {
      await browserPlatform.fs.mkdir('/profiles', { recursive: true });
    }
    
    await browserPlatform.fs.writeFile(
      '/profiles/user.json', 
      JSON.stringify(profile, null, 2)
    );
    
    console.log('用户配置保存成功');
  } catch (error) {
    console.error('保存用户配置失败:', error);
  }
}
```

## 最佳实践

1. **状态管理**
   - 使用Zustand来管理全局状态，避免过度使用Context API
   - 将状态分为多个独立的store，如chatStore, memoryStore, goalStore

2. **组件设计**
   - 优先使用函数组件和Hooks
   - 遵循Ant Design的设计规范
   - 拆分大型组件为更小的可复用组件

3. **异步操作**
   - 使用async/await处理异步操作
   - 实现正确的加载和错误状态处理

4. **性能优化**
   - 使用React.memo减少不必要的渲染
   - 使用Hooks的依赖数组避免不必要的重新计算
   - 实现虚拟滚动处理大量消息列表

## 调试与问题排查

1. **浏览器平台问题**
   - 使用浏览器开发工具检查IndexedDB存储
   - 监控控制台错误信息
   - 在AgentService初始化时添加详细的日志输出

2. **UI渲染问题**
   - 使用React DevTools分析组件结构和性能
   - 检查CSS覆盖问题

## 未来扩展

1. **插件系统**
   - 设计插件接口允许扩展AI能力
   - 实现插件管理UI

2. **多模态支持**
   - 添加图像和音频输入支持
   - 实现文件上传和共享功能

3. **离线支持**
   - 实现Service Worker缓存
   - 支持在无网络环境下的基本功能 