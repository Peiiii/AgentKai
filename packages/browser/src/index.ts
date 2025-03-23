/**
 * 浏览器环境平台抽象层实现包
 */
import { PlatformServices } from '@agentkai/core';
import { BrowserPlatformServices } from './platform';

/**
 * 浏览器环境平台服务实例
 */
const browserPlatform: PlatformServices = new BrowserPlatformServices();

export default browserPlatform;

// 导出所有浏览器平台相关的实现
export * from './platform';

export * from '@agentkai/core';

export { AISystem } from './core/AISystem';

export * from './memory/embedding/BrowserSearchProvider';

export * from './platform';

export * from './services/config.service';

export * from './storage/BrowserStorage';
