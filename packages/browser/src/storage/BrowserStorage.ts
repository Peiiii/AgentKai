import { QueryOptions, StorageProvider } from '@agentkai/core';
import { platform } from '../platform';
/**
 * 基于浏览器文件系统(IndexedDB)的存储实现
 * 使用平台抽象层的BrowserFileSystem进行实际的文件操作
 */
export class BrowserStorage<T extends { id: string }> extends StorageProvider<T> {
    /**
     * 创建BrowserStorage实例
     * @param basePath 数据存储的基础路径
     * @param name 存储名称（用于日志）
     */
    constructor(basePath: string, name: string = 'BrowserStorage') {
        super(basePath, name);
        this.ensureDirectoryExists();
    }

    /**
     * 保存数据到IndexedDB文件
     */
    protected async saveData(data: T): Promise<void> {
        try {
            const filePath = this.getFilePath(data.id);
            const serialized = JSON.stringify(data, null, 2);
            await platform.fs.writeFile(filePath, serialized);
        } catch (error) {
            throw new Error(`Failed to save data: ${(error as Error).message}`);
        }
    }

    /**
     * 根据ID从IndexedDB文件中获取数据
     */
    async get(id: string): Promise<T | null> {
        try {
            const filePath = this.getFilePath(id);
            
            if (!await platform.fs.exists(filePath)) {
                return null;
            }

            const content = await platform.fs.readFile(filePath);
            return JSON.parse(content) as T;
        } catch (error) {
            return null;
        }
    }

    /**
     * 根据ID删除数据
     */
    async delete(id: string): Promise<void> {
        try {
            const filePath = this.getFilePath(id);
            
            if (!await platform.fs.exists(filePath)) {
                return;
            }
            
            await platform.fs.unlink(filePath);
        } catch (error) {
            throw new Error(`Failed to delete data: ${(error as Error).message}`);
        }
    }

    /**
     * 列出所有存储的数据
     */
    async list(): Promise<T[]> {
        try {
            const dirPath = this.basePath;
            
            if (!await platform.fs.exists(dirPath)) {
                return [];
            }
            
            const files = await platform.fs.readdir(dirPath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            
            const results: T[] = [];
            
            for (const file of jsonFiles) {
                try {
                    const filePath = platform.path.join(dirPath, file);
                    const content = await platform.fs.readFile(filePath);
                    const data = JSON.parse(content) as T;
                    results.push(data);
                } catch (err) {
                    // 继续处理其他文件
                }
            }
            
            return results;
        } catch (error) {
            throw new Error(`Failed to list data: ${(error as Error).message}`);
        }
    }

    /**
     * 根据条件查询数据
     */
    async query(options: QueryOptions<T>): Promise<T[]> {
        try {
            // 获取所有数据
            const allItems = await this.list();
            
            // 如果没有过滤条件，返回所有数据
            if (!options.filter || Object.keys(options.filter).length === 0) {
                return this.applyPaginationAndSort(allItems, options);
            }
            
            // 过滤数据
            const filteredItems = allItems.filter(item => {
                return Object.entries(options.filter || {}).every(([key, value]) => {
                    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
                        // 复杂对象匹配 - 简单实现，实际可能需要更复杂的逻辑
                        return JSON.stringify(item[key as keyof T]) === JSON.stringify(value);
                    }
                    return item[key as keyof T] === value;
                });
            });
            
            // 应用分页和排序
            return this.applyPaginationAndSort(filteredItems, options);
        } catch (error) {
            throw new Error(`Query failed: ${(error as Error).message}`);
        }
    }

    /**
     * 清空所有数据
     */
    async clear(): Promise<void> {
        try {
            const dirPath = this.basePath;
            
            if (!await platform.fs.exists(dirPath)) {
                return;
            }
            
            const files = await platform.fs.readdir(dirPath);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            
            for (const file of jsonFiles) {
                try {
                    const filePath = platform.path.join(dirPath, file);
                    await platform.fs.unlink(filePath);
                } catch (err) {
                    // 继续处理其他文件
                }
            }
            
        } catch (error) {
            throw new Error(`Failed to clear data: ${(error as Error).message}`);
        }
    }

    /**
     * 确保存储目录存在
     */
    private async ensureDirectoryExists(): Promise<void> {
        try {
            const dirPath = this.basePath;
            
            if (!await platform.fs.exists(dirPath)) {
                await platform.fs.mkdir(dirPath, { recursive: true });
            }
        } catch (error) {
            throw new Error(`Failed to ensure directory exists: ${(error as Error).message}`);
        }
    }

    /**
     * 获取数据文件的路径
     */
    private getFilePath(id: string): string {
        // 确保ID是有效的文件名，移除不允许的字符
        const safeId = id.replace(/[/\\?%*:|"<>]/g, '-');
        return platform.path.join(this.basePath, `${safeId}.json`);
    }

    /**
     * 应用分页和排序
     */
    private applyPaginationAndSort(items: T[], options: QueryOptions<T>): T[] {
        let result = [...items];
        
        // 应用排序
        if (options.sort) {
            const { field, direction = 'asc' } = options.sort;
            result.sort((a, b) => {
                const aValue = a[field as keyof T];
                const bValue = b[field as keyof T];
                
                if (aValue === bValue) return 0;
                
                const compareResult = aValue < bValue ? -1 : 1;
                return direction === 'asc' ? compareResult : -compareResult;
            });
        }
        
        // 应用分页
        if (options.pagination) {
            const { offset = 0, limit } = options.pagination;
            
            if (limit !== undefined) {
                result = result.slice(offset, offset + limit);
            } else {
                result = result.slice(offset);
            }
        }
        
        return result;
    }
} 