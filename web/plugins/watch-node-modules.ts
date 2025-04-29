import type { ViteDevServer, Plugin } from 'vite';

/**
 * 创建一个用于监视特定 node_modules 包的 Vite 插件
 * @param packagesToWatch 需要监视的包名数组
 * @returns Vite 插件实例
 */
export const createWatchNodeModulesPlugin = (packagesToWatch: string[]): Plugin => ({
    name: 'watch-node-modules',
    configureServer: (server: ViteDevServer): void => {
        const watchPattern = packagesToWatch
            .map(pkg => pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // 转义特殊字符
            .join('|');
            
        server.watcher.options = {
            ...server.watcher.options,
            ignored: [
                new RegExp(`node_modules/(?!(${watchPattern})).*`),
                '**/.git/**',
            ]
        }
    }
}); 