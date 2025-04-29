// 从各个文件中导出类型和实现
export * from './fs';
export * from './env';
export * from './path';
export * from './info';
export * from './services';

// 导出单例实例
import { BrowserPlatformServiceFactory } from './services';
export const browserPlatform = new BrowserPlatformServiceFactory().create();