/**
 * Node.js环境平台抽象层实现包
 */
import { PlatformServices } from '@agentkai/core';
import { NodePlatformServices } from './services/platform';

/**
 * 重新导出Core包
 */
export * from '@agentkai/core';

/**
 * 导出特定服务
 */
export * from './services/config.service';
export * from './services/platform';
export * from './core/AISystem';

/**
 * Node.js环境平台服务实例
 */
const nodePlatform: PlatformServices = new NodePlatformServices();

export default nodePlatform;