import { QueryOptions } from './interfaces';
import { Logger } from '../utils/logger';

/**
 * 存储抽象类
 * 提供通用的数据存储接口，可由不同的具体存储实现（文件系统、浏览器IndexedDB等）
 */
export abstract class StorageProvider<T extends { id: string } = any> {
    protected logger: Logger;
    protected basePath: string;

    /**
     * 创建存储实例
     * @param basePath 存储基础路径
     * @param name 存储名称（用于日志）
     */
    constructor(basePath: string, name: string) {
        this.basePath = basePath;
        this.logger = new Logger(`Storage:${name}`);
    }

    /**
     * 获取存储基础路径
     * @returns 存储基础路径
     */
    getBasePath(): string {
        return this.basePath;
    }

    /**
     * 保存数据
     * 支持两种调用方式:
     * 1. save(data) - 直接保存带有id的数据对象
     * 2. save(id, data) - 指定id和数据对象分别保存
     *
     * @param idOrData 数据对象或者数据ID
     * @param data 当第一个参数为ID时的数据对象
     */
    async save(idOrData: string | T, data?: any): Promise<void> {
        if (typeof idOrData === 'string' && data) {
            // 形式: save(id, data)
            const objectWithId = { ...data, id: idOrData } as T;
            return this.saveData(objectWithId);
        } else if (typeof idOrData === 'object' && idOrData.id) {
            // 形式: save(data)
            return this.saveData(idOrData as T);
        } else {
            throw new Error('Invalid arguments: save requires either an ID and data object, or a data object with an ID');
        }
    }

    /**
     * 内部方法：实际保存数据
     * @param data 要保存的数据
     */
    protected abstract saveData(data: T): Promise<void>;

    /**
     * 根据ID获取数据
     * @param id 数据ID
     * @returns 获取的数据，不存在则返回null
     */
    abstract get(id: string): Promise<T | null>;

    /**
     * 根据ID删除数据
     * @param id 数据ID
     */
    abstract delete(id: string): Promise<void>;

    /**
     * 列出所有存储的数据
     * @returns 所有数据的数组
     */
    abstract list(): Promise<T[]>;

    /**
     * 根据条件查询数据
     * @param options 查询选项
     * @returns 符合条件的数据数组
     */
    abstract query(options: QueryOptions<T>): Promise<T[]>;

    /**
     * 清空所有数据
     */
    abstract clear(): Promise<void>;
}
