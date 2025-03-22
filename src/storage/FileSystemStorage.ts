import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StorageProvider } from '../types';
import { Logger } from '../utils/logger';

/**
 * 文件系统存储实现
 * 数据以JSON文件形式存储在指定目录
 */
export class FileSystemStorage implements StorageProvider {
    private basePath: string;
    private logger: Logger;

    /**
     * 创建文件系统存储
     * @param basePath 数据存储的基础路径
     * @param name 存储名称（用于日志）
     */
    constructor(basePath: string = 'data', name: string = 'FileStorage') {
        this.basePath = basePath;
        this.logger = new Logger(`FileSystemStorage:${name}`);
        this.ensureDirectoryExists(this.basePath);
        this.logger.info(`文件系统存储已初始化，路径: ${this.basePath}`);
    }

    /**
     * 保存数据
     * @param id 数据ID
     * @param data 要保存的数据
     */
    async save(id: string, data: any): Promise<void> {
        try {
            this.logger.debug(`保存数据 ID: ${id}`);
            
            const filePath = this.getFilePath(id);
            const jsonData = JSON.stringify(data, null, 2);
            
            await fs.promises.writeFile(filePath, jsonData, 'utf8');
            this.logger.debug(`数据已保存到 ${filePath}`);
        } catch (error) {
            this.logger.error(`保存数据失败 ID: ${id}:`, error);
            throw error;
        }
    }

    /**
     * 获取数据
     * @param id 数据ID
     * @returns 获取的数据，不存在则返回null
     */
    async get(id: string): Promise<any> {
        try {
            this.logger.debug(`获取数据 ID: ${id}`);
            
            const filePath = this.getFilePath(id);
            
            if (!fs.existsSync(filePath)) {
                this.logger.debug(`数据不存在 ID: ${id}`);
                return null;
            }
            
            const rawData = await fs.promises.readFile(filePath, 'utf8');
            return JSON.parse(rawData);
        } catch (error) {
            this.logger.error(`获取数据失败 ID: ${id}:`, error);
            throw error;
        }
    }

    /**
     * 删除数据
     * @param id 数据ID
     */
    async delete(id: string): Promise<void> {
        try {
            this.logger.debug(`删除数据 ID: ${id}`);
            
            const filePath = this.getFilePath(id);
            
            if (!fs.existsSync(filePath)) {
                this.logger.debug(`数据不存在，无需删除 ID: ${id}`);
                return;
            }
            
            await fs.promises.unlink(filePath);
            this.logger.debug(`数据已删除 ID: ${id}`);
        } catch (error) {
            this.logger.error(`删除数据失败 ID: ${id}:`, error);
            throw error;
        }
    }

    /**
     * 列出所有数据
     * @returns 所有数据的数组
     */
    async list(): Promise<any[]> {
        try {
            this.logger.debug('列出所有数据');
            
            // 确保目录存在
            this.ensureDirectoryExists(this.basePath);
            
            // 读取目录中的所有文件
            const files = await fs.promises.readdir(this.basePath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            
            this.logger.debug(`找到 ${jsonFiles.length} 个数据文件`);
            
            // 读取所有文件内容
            const dataPromises = jsonFiles.map(async (file) => {
                const filePath = path.join(this.basePath, file);
                const rawData = await fs.promises.readFile(filePath, 'utf8');
                return JSON.parse(rawData);
            });
            
            return await Promise.all(dataPromises);
        } catch (error) {
            this.logger.error('列出数据失败:', error);
            throw error;
        }
    }

    /**
     * 查询数据
     * @param filter 过滤条件
     * @returns 符合条件的数据数组
     */
    async query(filter?: Record<string, any>): Promise<any[]> {
        try {
            this.logger.debug('查询数据', { filter });
            
            // 获取所有数据
            const allData = await this.list();
            
            // 如果没有过滤条件，返回所有数据
            if (!filter || Object.keys(filter).length === 0) {
                return allData;
            }
            
            // 根据过滤条件筛选数据
            return allData.filter(item => {
                return Object.entries(filter).every(([key, value]) => {
                    // 处理嵌套属性，如 'metadata.type'
                    if (key.includes('.')) {
                        const parts = key.split('.');
                        let current = item;
                        
                        for (const part of parts) {
                            if (current === undefined || current === null) {
                                return false;
                            }
                            current = current[part];
                        }
                        
                        return current === value;
                    }
                    
                    return item[key] === value;
                });
            });
        } catch (error) {
            this.logger.error('查询数据失败:', error);
            throw error;
        }
    }

    /**
     * 清空所有数据
     */
    async clear(): Promise<void> {
        try {
            this.logger.warn('清空所有数据');
            
            // 确保目录存在
            this.ensureDirectoryExists(this.basePath);
            
            // 读取目录中的所有文件
            const files = await fs.promises.readdir(this.basePath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            
            // 删除所有JSON文件
            for (const file of jsonFiles) {
                const filePath = path.join(this.basePath, file);
                await fs.promises.unlink(filePath);
                this.logger.debug(`已删除文件: ${filePath}`);
            }
            
            this.logger.info(`已清空所有数据，共删除 ${jsonFiles.length} 个文件`);
        } catch (error) {
            this.logger.error('清空数据失败:', error);
            throw error;
        }
    }

    /**
     * 确保目录存在，不存在则创建
     * @param dirPath 目录路径
     */
    private ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            this.logger.info(`创建目录: ${dirPath}`);
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * 获取数据文件的完整路径
     * @param id 数据ID
     * @returns 文件路径
     */
    private getFilePath(id: string): string {
        // 清理ID，确保文件名安全
        const safeId = id.replace(/[^a-zA-Z0-9-_]/g, '_');
        return path.join(this.basePath, `${safeId}.json`);
    }
}

/**
 * 创建存储工厂，根据应用配置创建适当的存储实例
 */
export class StorageFactory {
    /**
     * 为特定实体创建存储实例
     * @param dataPath 基础数据目录
     * @param entityName 实体名称
     * @returns 存储提供者实例
     */
    static createEntityStorage(dataPath: string, entityName: string): StorageProvider {
        // 默认使用文件系统存储，但将来可以根据配置返回不同的实现
        const entityPath = path.join(dataPath, entityName);
        return new FileSystemStorage(entityPath, `${entityName}Storage`);
    }

    /**
     * 获取默认应用数据路径
     * @returns 默认数据路径
     */
    static getDefaultDataPath(): string {
        return path.join(os.homedir(), '.agentkai', 'data');
    }
}
