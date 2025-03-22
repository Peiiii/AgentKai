import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { StorageProvider } from '../types';
import { Logger } from '../utils/logger';

/**
 * 通用文件系统存储实现
 * 不再依赖于特定的业务实体（如Goal、Memory等）
 */
export class FileSystemStorage implements StorageProvider {
    private basePath: string;
    private initialized: Promise<void>;
    private logger: Logger;

    /**
     * 文件系统存储构造函数
     * @param basePath 基础路径，默认为用户目录下的.agentkai/data文件夹
     */
    constructor(basePath?: string) {
        // 如果未指定基础路径，则使用默认路径
        this.basePath = basePath || path.join(os.homedir(), '.agentkai', 'data');
        this.logger = new Logger('FileSystemStorage');
        
        this.logger.info(`使用数据存储路径: ${this.basePath}`);
        
        this.initialized = this.init().catch((error) => {
            this.logger.error('初始化存储目录失败:', error);
            throw error;
        });
    }

    private async init() {
        try {
            await fs.mkdir(this.basePath, { recursive: true });
            this.logger.debug('存储根目录初始化完成');
        } catch (error) {
            this.logger.error('创建存储根目录失败:', error);
            throw error;
        }
    }

    private async ensureInitialized() {
        await this.initialized;
    }

    /**
     * 确保集合目录存在
     * @param collection 集合名称
     */
    private async ensureCollectionExists(collection: string): Promise<string> {
        const collectionPath = path.join(this.basePath, collection);
        await fs.mkdir(collectionPath, { recursive: true });
        return collectionPath;
    }

    /**
     * 保存数据到指定集合
     * @param collection 集合名称
     * @param id 数据ID
     * @param data 要保存的数据
     */
    async save(collection: string, id: string, data: any): Promise<void> {
        await this.ensureInitialized();
        const collectionPath = await this.ensureCollectionExists(collection);
        const filePath = path.join(collectionPath, `${id}.json`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        this.logger.debug(`已保存数据到 ${collection}/${id}`);
    }

    /**
     * 获取指定集合中的数据
     * @param collection 集合名称
     * @param id 数据ID
     * @returns 数据对象，如果不存在则返回null
     */
    async get(collection: string, id: string): Promise<any> {
        await this.ensureInitialized();
        const collectionPath = await this.ensureCollectionExists(collection);
        const filePath = path.join(collectionPath, `${id}.json`);
        
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            // 如果文件不存在，则返回null
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }
            this.logger.error(`读取数据 ${collection}/${id} 时出错:`, error);
            throw error;
        }
    }

    /**
     * 从指定集合中删除数据
     * @param collection 集合名称
     * @param id 数据ID
     */
    async delete(collection: string, id: string): Promise<void> {
        await this.ensureInitialized();
        const collectionPath = await this.ensureCollectionExists(collection);
        const filePath = path.join(collectionPath, `${id}.json`);
        
        try {
            await fs.unlink(filePath);
            this.logger.debug(`已删除数据 ${collection}/${id}`);
        } catch (error) {
            // 忽略文件不存在的错误
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                this.logger.error(`删除数据 ${collection}/${id} 时出错:`, error);
                throw error;
            }
        }
    }

    /**
     * 获取指定集合中的所有数据
     * @param collection 集合名称
     * @returns 数据对象数组
     */
    async list(collection: string): Promise<any[]> {
        await this.ensureInitialized();
        const collectionPath = await this.ensureCollectionExists(collection);
        
        try {
            const files = await fs.readdir(collectionPath);
            const result: any[] = [];
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                try {
                    const filePath = path.join(collectionPath, file);
                    const data = await fs.readFile(filePath, 'utf-8');
                    result.push(JSON.parse(data));
                } catch (error) {
                    this.logger.warn(`读取文件 ${file} 时出错:`, error);
                }
            }
            
            return result;
        } catch (error) {
            // 如果目录不存在，则返回空数组
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }
            this.logger.error(`列出集合 ${collection} 时出错:`, error);
            throw error;
        }
    }

    /**
     * 根据过滤条件查询集合中的数据
     * @param collection 集合名称
     * @param filter 过滤条件（简单实现，仅支持字段完全匹配）
     * @returns 匹配的数据对象数组
     */
    async query(collection: string, filter?: Record<string, any>): Promise<any[]> {
        const allItems = await this.list(collection);
        
        if (!filter || Object.keys(filter).length === 0) {
            return allItems;
        }
        
        return allItems.filter(item => {
            for (const [key, value] of Object.entries(filter)) {
                if (item[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * 清空指定集合
     * @param collection 集合名称
     */
    async clear(collection: string): Promise<void> {
        await this.ensureInitialized();
        const collectionPath = path.join(this.basePath, collection);
        
        try {
            await fs.rm(collectionPath, { recursive: true, force: true });
            await fs.mkdir(collectionPath, { recursive: true });
            this.logger.info(`已清空集合 ${collection}`);
        } catch (error) {
            this.logger.error(`清空集合 ${collection} 时出错:`, error);
            throw error;
        }
    }

    /**
     * 清空所有数据
     */
    async clearAll(): Promise<void> {
        await this.ensureInitialized();
        
        try {
            await fs.rm(this.basePath, { recursive: true, force: true });
            await fs.mkdir(this.basePath, { recursive: true });
            this.logger.info('已清空所有数据');
        } catch (error) {
            this.logger.error('清空所有数据时出错:', error);
            throw error;
        }
    }
}
