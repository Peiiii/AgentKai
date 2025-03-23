import { Memory } from '../types';
import { Logger } from '../utils/logger';
import { platform } from '../platform';
import { Storage } from './Storage';
import { QueryOptions } from './interfaces';
import { firstValueFrom, ReplaySubject } from 'rxjs';

// 存储工厂函数类型
type StorageProviderFactory = (path: string, name: string) => Storage<any>;

/**
 * 内存存储实现
 * 用于测试或回退方案
 */
class InMemoryStorage extends Storage<any> {
    private store: Map<string, any>;

    constructor(basePath: string, name: string) {
        super(basePath, name);
        this.store = new Map<string, any>();
        this.logger.info('创建内存存储，数据将在应用重启后丢失');
    }

    protected async saveData(data: any): Promise<void> {
        this.store.set(data.id, structuredClone(data));
    }

    async get(id: string): Promise<any | null> {
        const data = this.store.get(id);
        return data ? structuredClone(data) : null;
    }

    async delete(id: string): Promise<void> {
        this.store.delete(id);
    }

    async list(): Promise<any[]> {
        return Array.from(this.store.values()).map((item) => structuredClone(item));
    }

    async query(options: QueryOptions): Promise<any[]> {
        const allItems = await this.list();

        if (!options.filter || Object.keys(options.filter).length === 0) {
            return allItems;
        }

        return allItems.filter((item) => {
            return Object.entries(options.filter || {}).every(([key, value]) => {
                if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
                    return JSON.stringify(item[key]) === JSON.stringify(value);
                }
                return item[key] === value;
            });
        });
    }

    async clear(): Promise<void> {
        this.store.clear();
    }
}

/**
 * 存储工厂类，负责创建和管理各种存储实例
 */
export class StorageManager {
    private static instance: StorageManager;
    private dataPath: string;
    private storageInstances: Map<string, Storage<any>>;
    private logger: Logger;
    private storageProviderFactory: StorageProviderFactory | undefined;
    private initialized$ = new ReplaySubject<boolean>(1);

    /**
     * 创建存储工厂实例
     * @param dataPath 数据存储的根路径
     * @param storageProviderFactory 可选的存储提供者工厂函数
     */
    constructor(dataPath: string, storageProviderFactory?: StorageProviderFactory) {
        this.dataPath = dataPath;
        this.storageInstances = new Map<string, Storage<any>>();
        this.logger = new Logger('StorageManager');

        // 如果没有提供存储工厂函数，根据平台类型自动选择
        if (!storageProviderFactory) {
            this.initializeStorage();
        } else {
            this.storageProviderFactory = storageProviderFactory;
        }
    }

    async initialize(): Promise<void> {
        await firstValueFrom(this.initialized$);
    }

    /**
     * 根据平台类型初始化适当的存储提供者
     */
    private async initializeStorage(): Promise<void> {
        console.log(
            'platformInfo:',
            platform.platformInfo,
            'isNode:',
            platform.platformInfo.isNode(),
            'isBrowser:',
            platform.platformInfo.isBrowser()
        );
        // 根据平台类型选择存储实现
        if (platform.platformInfo.isNode()) {
            this.logger.info('使用Node.js文件系统存储');
            try {
                // 动态导入FileSystemStorage，避免浏览器环境下的静态依赖
                const { FileSystemStorage } = await import('./FileSystemStorage');
                this.storageProviderFactory = (path, name) => new FileSystemStorage(path, name);
            } catch (error) {
                this.logger.error('无法加载FileSystemStorage:', error);
                this.storageProviderFactory = this.createInMemoryStorage;
            }
        } else if (platform.platformInfo.isBrowser()) {
            this.logger.info('使用浏览器存储(IndexedDB)');
            try {
                // 动态导入BrowserStorage，使用IndexedDB实现的文件系统
                const { BrowserStorage } = await import('./BrowserStorage');
                this.storageProviderFactory = (path, name) => new BrowserStorage(path, name);
            } catch (error) {
                this.logger.error('无法加载BrowserStorage:', error);
                this.storageProviderFactory = this.createInMemoryStorage;
            }
        } else {
            this.logger.warn('未知平台类型，使用内存存储作为回退选项');
            this.storageProviderFactory = this.createInMemoryStorage;
        }

        // 重新创建现有的存储实例
        this.recreateStorageInstances();
        this.initialized$.next(true);
    }

    /**
     * 重新创建所有已存在的存储实例
     * 在动态加载存储提供者后调用
     */
    private recreateStorageInstances(): void {
        if (!this.storageProviderFactory) return;

        const existingInstances = new Map(this.storageInstances);
        this.storageInstances.clear();

        for (const [domain] of existingInstances) {
            const domainPath = platform.path.join(this.dataPath, domain);
            const storage = this.storageProviderFactory(domainPath, domain);
            this.storageInstances.set(domain, storage);
        }
    }

    /**
     * 创建内存存储提供者
     */
    private createInMemoryStorage(path: string, name: string): Storage<any> {
        this.logger.warn(`为 ${name} 使用内存存储。注意：重启后数据将丢失!`);
        return new InMemoryStorage(path, name);
    }

    /**
     * 获取StorageManager单例
     * @param dataPath 数据存储路径
     * @param storageProviderFactory 可选的存储提供者工厂
     */
    static getInstance(
        dataPath: string,
        storageProviderFactory?: StorageProviderFactory
    ): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager(dataPath, storageProviderFactory);
        }
        return StorageManager.instance;
    }

    /**
     * 获取指定域的存储实例
     * @param domain 存储域名称
     */
    getStorage<T extends { id: string } = any>(domain: string): Storage<T> {
        if (this.storageInstances.has(domain)) {
            return this.storageInstances.get(domain) as Storage<T>;
        }

        const domainPath = platform.path.join(this.dataPath, domain);

        // 如果存储提供者工厂尚未初始化，使用内存存储作为临时解决方案
        if (!this.storageProviderFactory) {
            this.logger.warn('存储提供者工厂尚未初始化，使用内存存储');
            const tempStorage = this.createInMemoryStorage(domainPath, domain);
            this.storageInstances.set(domain, tempStorage);
            return tempStorage as Storage<T>;
        }

        // 创建新的存储实例
        const storage = this.storageProviderFactory(domainPath, domain);
        this.storageInstances.set(domain, storage);
        return storage as Storage<T>;
    }

    /**
     * 获取目标存储实例
     */
    getGoalStorage(): Storage<any> {
        return this.getStorage('goals');
    }

    /**
     * 获取记忆存储实例
     * @returns 记忆存储提供者
     */
    getMemoryStorage(): Storage<Memory> {
        return this.getStorage<Memory>('memories');
    }

    /**
     * 获取工具存储实例
     */
    getToolStorage(): Storage<any> {
        return this.getStorage('tools');
    }

    /**
     * 获取配置存储实例
     */
    getConfigStorage(): Storage<any> {
        return this.getStorage('config');
    }
}
