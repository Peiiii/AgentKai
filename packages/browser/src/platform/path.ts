import { PathUtils } from '@agentkai/core';

/**
 * 浏览器环境的路径工具实现
 */
export class BrowserPathUtils implements PathUtils {
    home(): string {
        // 在浏览器中，没有真正的主目录概念
        return '/home/browser-user';
    }
    
    join(...paths: string[]): string {
        // 简单的路径拼接实现
        return paths
            .filter(Boolean)
            .join('/')
            .replace(/\/+/g, '/'); // 替换多个连续的/为单个/
    }
    
    resolve(...paths: string[]): string {
        // 浏览器中的路径解析简化实现
        const segments: string[] = [];
        
        for (const path of paths) {
            if (path.startsWith('/')) {
                // 绝对路径，重置segments
                segments.length = 0;
            }
            
            const parts = path.split('/');
            for (const part of parts) {
                if (part === '.' || part === '') continue;
                if (part === '..') {
                    segments.pop();
                } else {
                    segments.push(part);
                }
            }
        }
        
        return '/' + segments.join('/');
    }
    
    dirname(pathString: string): string {
        if (!pathString.includes('/')) return '.';
        // 移除末尾的/
        pathString = pathString.replace(/\/+$/, '');
        return pathString.substring(0, pathString.lastIndexOf('/')) || '/';
    }
    
    basename(pathString: string): string {
        // 移除末尾的/
        pathString = pathString.replace(/\/+$/, '');
        return pathString.substring(pathString.lastIndexOf('/') + 1) || '';
    }
    
    extname(pathString: string): string {
        const basename = this.basename(pathString);
        const dotIndex = basename.lastIndexOf('.');
        return dotIndex > 0 ? basename.substring(dotIndex) : '';
    }
} 