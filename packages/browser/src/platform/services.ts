import { PlatformServices, PlatformType } from '@agentkai/core';
import { IndexedDBFileSystem } from './fs';
import { BrowserEnvProvider } from './env';
import { BrowserPathUtils } from './path';
import { BrowserPlatformInfo } from './info';

/**
 * 浏览器环境的平台服务实现
 */
export class BrowserPlatformServices implements PlatformServices {
    type: PlatformType = PlatformType.BROWSER;
    fs = new IndexedDBFileSystem('agentkai-fs', 'files');
    env = new BrowserEnvProvider();
    path = new BrowserPathUtils();
    platformInfo = new BrowserPlatformInfo();
}

/**
 * 浏览器环境的平台服务工厂
 */
export class BrowserPlatformServiceFactory {
    create(): PlatformServices {
        return new BrowserPlatformServices();
    }
} 