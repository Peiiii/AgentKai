import { FileSystem, PathUtils, PlatformInfo, QueryOptions, StorageProvider } from '@agentkai/core';
import { platform } from '../platform';

/**
 * 文件系统存储实现
 * 数据以JSON文件形式存储在指定目录
 */
export class FileSystemStorage<T extends { id: string }> extends StorageProvider<T> {
    private fs: FileSystem;
    private pathUtils: PathUtils;
    private platformInfo: PlatformInfo;

    /**
     * 创建文件系统存储
     * @param basePath 数据存储的基础路径
     * @param name 存储名称（用于日志）
     */
    constructor(basePath: string = 'data', name: string = 'FileStorage') {
        super(basePath, name);
        this.fs = platform.fs;
        this.pathUtils = platform.path;
        this.platformInfo = platform.platformInfo;
        this.ensureDirectoryExists(this.basePath);
        this.logger.info(`文件系统存储已初始化，路径: ${this.basePath}`);
    }

    /**
     * 保存数据
     */
    protected async saveData(data: T): Promise<void> {
        try {
            this.logger.debug(`保存数据 ID: ${data.id}`);

            const filePath = this.getFilePath(data.id);
            const jsonData = JSON.stringify(data, null, 2);

            await this.fs.writeFile(filePath, jsonData);
            this.logger.debug(`数据已保存到 ${filePath}`);
        } catch (error) {
            this.logger.error(`保存数据失败 ID: ${data.id}:`, error);
            throw error;
        }
    }

    /**
     * 获取数据
     * @param id 数据ID
     * @returns 获取的数据，不存在则返回null
     */
    async get(id: string): Promise<T | null> {
        try {
            this.logger.debug(`获取数据 ID: ${id}`);

            const filePath = this.getFilePath(id);

            if (!(await this.fs.exists(filePath))) {
                this.logger.debug(`数据不存在 ID: ${id}`);
                return null;
            }

            const rawData = await this.fs.readFile(filePath);
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

            if (!(await this.fs.exists(filePath))) {
                this.logger.debug(`数据不存在，无需删除 ID: ${id}`);
                return;
            }

            await this.fs.unlink(filePath);
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
    async list(): Promise<T[]> {
        try {
            this.logger.debug('列出所有数据');

            // 确保目录存在
            this.ensureDirectoryExists(this.basePath);

            // 读取目录中的所有文件
            const files = await this.fs.readdir(this.basePath);
            const jsonFiles = files.filter((file) => file.endsWith('.json'));

            this.logger.debug(`找到 ${jsonFiles.length} 个数据文件`);

            // 读取所有文件内容
            const dataPromises = jsonFiles.map(async (file) => {
                const filePath = this.pathUtils.join(this.basePath, file);
                const rawData = await this.fs.readFile(filePath);
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
     * @param options 查询选项
     * @returns 符合条件的数据数组
     */
    async query(options: QueryOptions<T>): Promise<T[]> {
        try {
            this.logger.debug('查询数据', { options });

            // 获取所有数据
            const allData = await this.list();

            // 如果没有过滤条件，返回所有数据
            if (!options.filter || Object.keys(options.filter).length === 0) {
                return allData;
            }

            // 根据过滤条件筛选数据
            const filteredData = allData.filter((item) => {
                return Object.entries(options.filter || {}).every(([key, value]) => {
                    // 处理嵌套属性，如 'metadata.type'
                    if (key.includes('.')) {
                        const parts = key.split('.');
                        let current = item as any;

                        for (const part of parts) {
                            if (current === undefined || current === null) {
                                return false;
                            }
                            current = current[part];
                        }

                        return current === value;
                    }

                    return (item as any)[key] === value;
                });
            });

            return filteredData;
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
            const files = await this.fs.readdir(this.basePath);
            const jsonFiles = files.filter((file) => file.endsWith('.json'));

            // 删除所有JSON文件
            for (const file of jsonFiles) {
                const filePath = this.pathUtils.join(this.basePath, file);
                await this.fs.unlink(filePath);
                this.logger.debug(`已删除文件: ${filePath}`);
            }

            this.logger.info(`已清空所有数据，共删除 ${jsonFiles.length} 个文件`);
        } catch (error) {
            this.logger.error('清空数据失败:', error);
            throw error;
        }
    }

    /**
     * 确保目录存在
     */
    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            if (!(await this.fs.exists(dirPath))) {
                this.logger.debug(`创建目录: ${dirPath}`);
                await this.fs.mkdir(dirPath, { recursive: true });
            }
        } catch (error) {
            this.logger.error(`创建目录失败: ${dirPath}:`, error);
            throw error;
        }
    }

    /**
     * 获取文件路径
     */
    private getFilePath(id: string): string {
        // 清理ID，确保是安全的文件名
        const safeId = id.replace(/[/\\?%*:|"<>]/g, '-');
        return this.pathUtils.join(this.basePath, `${safeId}.json`);
    }
}
