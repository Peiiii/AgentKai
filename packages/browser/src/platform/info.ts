import { PlatformInfo } from '@agentkai/core';

/**
 * 浏览器环境的平台信息实现
 */
export class BrowserPlatformInfo implements PlatformInfo {
    homeDir(): string {
        // 在浏览器中，没有真正的主目录概念
        return '/home/browser-user';
    }
    
    platform(): string {
        return 'browser';
    }
    
    isNode(): boolean {
        return false;
    }
    
    isBrowser(): boolean {
        return true;
    }
    
    tmpdir(): string {
        // 浏览器中没有临时目录的概念
        return '/tmp';
    }
    
    cwd(): string {
        // 浏览器中没有当前工作目录的概念
        return '/';
    }
} 