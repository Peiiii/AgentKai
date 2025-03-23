/**
 * 平台抽象层入口
 *
 * 根据运行环境自动选择合适的平台服务实现
 * 目前支持：
 * - Node.js: 使用 @agentkai/node 包提供实现
 * - 浏览器: 使用 @agentkai/browser 包提供实现
 */

import { PlatformServices, PlatformType } from './interfaces';

/**
 * 全局平台服务实例
 */
let platformInstance: PlatformServices | null = null;

/**
 * 检测当前运行环境
 * @returns 环境类型
 */
function detectEnvironment(): 'browser' | 'node' | 'unknown' {
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
        return 'browser';
    } else if (
        typeof globalThis !== 'undefined' && 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof (globalThis as any).process !== 'undefined' && 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof (globalThis as any).process.versions !== 'undefined' && 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof (globalThis as any).process.versions.node !== 'undefined'
    ) {
        return 'node';
    }
    return 'unknown';
}

/**
 * 创建一个基本的后备平台实现
 * 在无法加载实际平台时使用
 */
function createFallbackPlatform(type: PlatformType = PlatformType.UNKNOWN): PlatformServices {
    const platform: PlatformServices = {
        type,
        fs: {
            readFile: async () => Promise.reject(new Error('平台未实现文件系统功能')),
            writeFile: async () => Promise.reject(new Error('平台未实现文件系统功能')),
            exists: async () => false,
            mkdir: async () => Promise.reject(new Error('平台未实现文件系统功能')),
            readdir: async () => Promise.reject(new Error('平台未实现文件系统功能')),
            unlink: async () => Promise.reject(new Error('平台未实现文件系统功能')),
            stat: async () => Promise.reject(new Error('平台未实现文件系统功能')),
        },
        env: {
            get: () => undefined,
            set: () => {},
            getAll: () => ({}),
        },
        path: {
            join: (...paths: string[]) => paths.join('/'),
            resolve: (...paths: string[]) => paths.join('/'),
            dirname: (path: string) => path.split('/').slice(0, -1).join('/') || '/',
            basename: (path: string) => path.split('/').pop() || '',
            extname: (path: string) => {
                const parts = path.split('.');
                return parts.length > 1 ? `.${parts.pop()}` : '';
            },
        },
        platformInfo: {
            homeDir: () => '',
            platform: () => 'unknown',
            isNode: () => type === PlatformType.NODE,
            isBrowser: () => type === PlatformType.BROWSER,
            tmpdir: () => '/tmp',
            cwd: () => '/',
        },
    };
    
    return platform;
}

/**
 * 同步获取平台服务
 * 注意：如果平台服务尚未初始化，会返回一个后备实现
 */
export function getPlatform(): PlatformServices {
    if (!platformInstance) {
        console.warn('平台服务尚未初始化，将使用后备实现。建议先调用 initPlatform()');
        return createFallbackPlatform();
    }
    return platformInstance;
}

/**
 * 初始化平台服务
 * 该函数返回一个平台服务单例，根据运行环境自动选择正确的实现
 */
export async function initPlatform(): Promise<PlatformServices> {
    if (platformInstance) {
        return platformInstance;
    }

    const env = detectEnvironment();
    
    try {
        if (env === 'browser') {
            console.log('检测到浏览器环境，将使用浏览器实现');
            try {
                // 注意：这里的导入路径会在构建时处理
                // @ts-expect-error - 动态导入模块在构建时处理
                const browserModule = await import('@agentkai/browser');
                platformInstance = browserModule.default;
            } catch (error) {
                console.warn('无法加载浏览器平台实现，将使用后备实现', error);
                platformInstance = createFallbackPlatform(PlatformType.BROWSER);
            }
        } else if (env === 'node') {
            console.log('检测到Node.js环境，将使用Node.js实现');
            try {
                // 注意：这里的导入路径会在构建时处理
                // @ts-expect-error - 动态导入模块在构建时处理
                const nodeModule = await import('@agentkai/node');
                platformInstance = nodeModule.default;
            } catch (error) {
                console.warn('无法加载Node.js平台实现，将使用后备实现', error);
                platformInstance = createFallbackPlatform(PlatformType.NODE);
            }
        } else {
            console.warn('未知环境，将使用后备实现');
            platformInstance = createFallbackPlatform();
        }
    } catch (error) {
        console.error(
            `加载平台服务失败: ${error instanceof Error ? error.message : String(error)}`
        );
        console.warn('将使用后备平台实现');
        platformInstance = createFallbackPlatform();
    }

    return platformInstance as PlatformServices;
}

// 创建默认的平台实例
// 注意：这是一个临时的实例，在实际应用中应该调用 initPlatform()
const defaultPlatform = createFallbackPlatform();

// 导出平台服务接口和类型定义
export * from './interfaces';

// 导出默认平台实例
export default defaultPlatform;

// 为了方便使用，也导出平台服务的引用
export const platform = defaultPlatform;

/**
 * 浏览器平台适配状态:
 * ✅ 已完成
 * - 定义平台抽象接口
 * - 实现Node.js环境服务
 * - 实现浏览器环境服务
 * - 实现IndexedDB的持久化存储
 *
 * ⬜ 待完成
 * - 解决hnswlib-node在浏览器环境的兼容性问题
 * - 创建浏览器环境测试用例
 * - 验证所有功能在浏览器环境中正常工作
 */
