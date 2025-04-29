import { FileSystem } from '@agentkai/core';
import LightningFS from '@isomorphic-git/lightning-fs';

/**
 * 浏览器环境的文件系统实现，使用 lightning-fs 库
 * lightning-fs 是一个轻量级且快速的基于 IndexedDB 的文件系统
 */
export class IndexedDBFileSystem implements FileSystem {
    private fs: any;
    private lfs: any;

    constructor(
        dbName: string,
        _storeName: string  // 重命名参数，添加前缀 '_' 表示不使用
    ) {
        // 创建独立的数据库名称，防止冲突
        const uniqueDbName = `agentkai-${dbName}`;
        
        // 创建 LightningFS 实例
        // 注意：不再自定义 fileStoreName，使用默认值避免键冲突
        this.lfs = new LightningFS(uniqueDbName, { 
            wipe: false
        });
        
        // 使用 promises API
        this.fs = this.lfs.promises;
    }

    async readFile(path: string): Promise<string> {
        try {
            // lightning-fs 默认返回 Uint8Array，但我们需要字符串
            const data = await this.fs.readFile(path, { encoding: 'utf8' });
            return data;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                throw new Error(`文件不存在: ${path}`);
            }
            throw new Error(`读取文件失败: ${path}`);
        }
    }
    
    async writeFile(path: string, data: string): Promise<void> {
        try {
            // 确保目录存在
            const dirPath = this.getDirname(path);
            await this.ensureDir(dirPath);
            
            // 写入文件
            await this.fs.writeFile(path, data, { encoding: 'utf8' });
        } catch (error) {
            throw new Error(`写入文件失败: ${path}`);
        }
    }
    
    async exists(path: string): Promise<boolean> {
        try {
            await this.fs.stat(path);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    async mkdir(path: string, options?: { recursive: boolean }): Promise<void> {
        try {
            // 如果是递归创建，需要确保父目录存在
            if (options?.recursive) {
                await this.ensureDir(path);
            } else {
                await this.fs.mkdir(path);
            }
        } catch (error: any) {
            // 如果目录已存在，不需要抛出错误
            if (error.code === 'EEXIST') {
                return;
            }
            throw new Error(`创建目录失败: ${path}`);
        }
    }
    
    async readdir(path: string): Promise<string[]> {
        try {
            return await this.fs.readdir(path);
        } catch (error) {
            throw new Error(`读取目录失败: ${path}`);
        }
    }
    
    async unlink(path: string): Promise<void> {
        try {
            await this.fs.unlink(path);
        } catch (error) {
            throw new Error(`删除文件失败: ${path}`);
        }
    }
    
    async stat(path: string): Promise<{ isDirectory(): boolean }> {
        try {
            const stats = await this.fs.stat(path);
            return {
                isDirectory: () => stats.isDirectory()
            };
        } catch (error) {
            // 特殊路径处理
            if (path === '/') {
                return {
                    isDirectory: () => true
                };
            }
            
            throw new Error(`获取文件状态失败: ${path}`);
        }
    }

    /**
     * 确保目录存在，如果不存在则递归创建
     */
    private async ensureDir(path: string): Promise<void> {
        if (path === '/' || path === '') return;
        
        try {
            await this.fs.mkdir(path);
        } catch (error: any) {
            if (error.code === 'EEXIST') {
                // 目录已存在，不需处理
                return;
            } else if (error.code === 'ENOENT') {
                // 父目录不存在，递归创建
                const parent = this.getDirname(path);
                await this.ensureDir(parent);
                await this.fs.mkdir(path);
            } else {
                throw error;
            }
        }
    }

    /**
     * 获取路径的目录部分
     */
    private getDirname(path: string): string {
        if (!path.includes('/')) return '.';
        // 移除末尾的/
        path = path.replace(/\/+$/, '');
        return path.substring(0, path.lastIndexOf('/')) || '/';
    }
} 