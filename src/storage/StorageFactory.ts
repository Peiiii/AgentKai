import { StorageProvider } from '../types';
import { FileSystemStorage } from './FileSystemStorage';
import { Logger } from '../utils/logger';
import path from 'path';

/**
 * 存储工厂类，负责创建和管理各种存储实例
 */
export class StorageFactory {
    private basePath: string;
    private storageInstances: Map<string, StorageProvider>;
    private logger: Logger;

    /**
     * 创建存储工厂
     * @param basePath 基础存储路径
     */
    constructor(basePath: string) {
        this.basePath = basePath;
        this.storageInstances = new Map<string, StorageProvider>();
        this.logger = new Logger('StorageFactory');
        this.logger.info(`初始化存储工厂，基础路径: ${basePath}`);
    }

    /**
     * 获取特定领域的存储实例
     * @param domain 领域名称（例如：'goals', 'memories'等）
     * @returns 该领域的存储提供者
     */
    getStorage(domain: string): StorageProvider {
        // 如果实例已存在，直接返回
        if (this.storageInstances.has(domain)) {
            return this.storageInstances.get(domain)!;
        }

        // 否则创建新实例
        this.logger.info(`为领域 ${domain} 创建新的存储实例`);
        const domainPath = path.join(this.basePath, domain);
        const storage = new FileSystemStorage(domainPath, domain);
        
        // 缓存实例
        this.storageInstances.set(domain, storage);
        
        return storage;
    }

    /**
     * 获取目标存储
     * @returns 目标存储实例
     */
    getGoalStorage(): StorageProvider {
        return this.getStorage('goals');
    }

    /**
     * 获取记忆存储
     * @returns 记忆存储实例
     */
    getMemoryStorage(): StorageProvider {
        return this.getStorage('memories');
    }

    /**
     * 获取工具存储
     * @returns 工具存储实例
     */
    getToolStorage(): StorageProvider {
        return this.getStorage('tools');
    }

    /**
     * 获取配置存储
     * @returns 配置存储实例
     */
    getConfigStorage(): StorageProvider {
        return this.getStorage('config');
    }

    /**
     * 清除所有存储数据
     * 谨慎使用！
     */
    async clearAllStorages(): Promise<void> {
        this.logger.warn('清除所有存储数据');
        
        // 清除每个存储实例的数据
        for (const [domain, storage] of this.storageInstances.entries()) {
            this.logger.info(`清除 ${domain} 存储数据`);
            await storage.clear();
        }
        
        this.logger.info('所有存储数据已清除');
    }
} 