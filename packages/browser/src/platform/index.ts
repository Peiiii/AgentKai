import {
    EnvProvider,
    FileSystem,
    PathUtils,
    PlatformInfo,
    PlatformServices,
    PlatformType,
} from '@agentkai/core';

/**
 * 浏览器环境的文件系统实现，使用IndexedDB
 */
export class IndexedDBFileSystem implements FileSystem {
    private db: IDBDatabase | null = null;
    private indexedDB: IDBFactory;
    private dbName: string;
    private storeName: string;

    constructor(
        dbName: string,
        storeName: string
    ) {
        this.indexedDB = window.indexedDB || (window as any).mozIndexedDB || 
                        (window as any).webkitIndexedDB || (window as any).msIndexedDB;
        this.dbName = dbName;
        this.storeName = storeName;
    }

    private async getDB(): Promise<IDBDatabase> {
        if (this.db) {
            return this.db;
        }

        return new Promise((resolve, reject) => {
            const request = this.indexedDB.open(this.dbName, 1);
            
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'path' });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve(this.db);
            };
            
            request.onerror = (event) => {
                reject(new Error(`无法打开数据库: ${(event.target as any).errorCode}`));
            };
        });
    }

    private async getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
        const db = await this.getDB();
        const transaction = db.transaction([this.storeName], mode);
        return transaction.objectStore(this.storeName);
    }

    async readFile(path: string): Promise<string> {
        const store = await this.getStore();
        return new Promise((resolve, reject) => {
            const request = store.get(path);
            
            request.onsuccess = () => {
                const result = (request.result as any);
                if (!result) {
                    reject(new Error(`文件不存在: ${path}`));
                    return;
                }
                resolve(result.content);
            };
            
            request.onerror = () => {
                reject(new Error(`读取文件失败: ${path}`));
            };
        });
    }
    
    async writeFile(path: string, data: string): Promise<void> {
        const store = await this.getStore('readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put({ path, content: data, timestamp: Date.now() });
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(new Error(`写入文件失败: ${path}`));
            };
        });
    }
    
    async exists(path: string): Promise<boolean> {
        const store = await this.getStore();
        return new Promise((resolve) => {
            const request = store.get(path);
            
            request.onsuccess = () => {
                resolve(!!((request.result as any)));
            };
            
            request.onerror = () => {
                resolve(false);
            };
        });
    }
    
    async mkdir(path: string, _options?: { recursive: boolean }): Promise<void> {
        // 在浏览器环境中，我们只需要确保文件目录的路径存在
        // 由于IndexedDB没有目录结构，我们实际上不需要创建目录
        // 但为了兼容性，我们创建一个特殊的标记文件以表示目录存在
        const dirMarker = `${path}/.dir`;
        await this.writeFile(dirMarker, '');
    }
    
    async readdir(path: string): Promise<string[]> {
        const store = await this.getStore();
        return new Promise((resolve, reject) => {
            const request = store.openCursor();
            
            const files: string[] = [];
            // 确保dirPath以/结尾以便正确匹配
            const normalizedDirPath = path.endsWith('/') ? path : `${path}/`;
            
            request.onerror = () => {
                reject(new Error(`读取目录失败: ${path}`));
            };
            
            request.onsuccess = (event) => {
                const cursor = (event.target as any).result;
                if (cursor) {
                    const filePath = cursor.value.path;
                    // 检查是否是该目录下的文件/子目录
                    if (filePath.startsWith(normalizedDirPath) && filePath !== `${path}/.dir`) {
                        // 提取文件/目录名
                        const relativePath = filePath.slice(normalizedDirPath.length);
                        // 只包含一级子项
                        if (!relativePath.includes('/')) {
                            files.push(relativePath);
                        }
                    }
                    cursor.continue();
                } else {
                    resolve(files);
                }
            };
        });
    }
    
    async unlink(path: string): Promise<void> {
        const store = await this.getStore('readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(path);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(new Error(`删除文件失败: ${path}`));
            };
        });
    }
    
    async stat(path: string): Promise<{ isDirectory(): boolean }> {
        const isDir = await this.exists(`${path}/.dir`);
        
        return {
            isDirectory: () => {
                return isDir || path === '/';
            }
        };
    }
}

/**
 * 浏览器环境的环境变量提供者实现，使用localStorage
 */
export class BrowserEnvProvider implements EnvProvider {
    private readonly STORAGE_KEY_PREFIX = 'agentkai_env_';
    
    get(key: string, defaultValue?: string): string | undefined {
        const value = localStorage.getItem(this.STORAGE_KEY_PREFIX + key);
        return value !== null ? value : defaultValue;
    }
    
    set(key: string, value: string): void {
        localStorage.setItem(this.STORAGE_KEY_PREFIX + key, value);
    }
    
    getAll(): Record<string, string> {
        const env: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
                const envKey = key.slice(this.STORAGE_KEY_PREFIX.length);
                const value = localStorage.getItem(key);
                if (value !== null) {
                    env[envKey] = value;
                }
            }
        }
        return env;
    }
}

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

/**
 * 浏览器环境的平台服务实现
 */
export class BrowserPlatformServices implements PlatformServices {
    type: PlatformType = PlatformType.BROWSER;
    fs: FileSystem = new IndexedDBFileSystem('agentkai-fs', 'files');
    env: EnvProvider = new BrowserEnvProvider();
    path: PathUtils = new BrowserPathUtils();
    platformInfo: PlatformInfo = new BrowserPlatformInfo();
}

/**
 * 浏览器环境的平台服务工厂
 */
export class BrowserPlatformServiceFactory {
    create(): PlatformServices {
        return new BrowserPlatformServices();
    }
}

export const platform = new BrowserPlatformServiceFactory().create();