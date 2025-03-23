import {
    EnvProvider,
    FileSystem,
    PathUtils,
    PlatformInfo,
    PlatformServices,
    PlatformType,
} from '@agentkai/core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Node.js环境的文件系统实现
 */
export class NodeFileSystem implements FileSystem {
    async readFile(filePath: string): Promise<string> {
        return fs.promises.readFile(filePath, { encoding: 'utf-8' });
    }

    async writeFile(filePath: string, data: string): Promise<void> {
        await fs.promises.writeFile(filePath, data, { encoding: 'utf-8' });
    }

    async exists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async mkdir(filePath: string, options?: { recursive: boolean }): Promise<void> {
        await fs.promises.mkdir(filePath, options);
    }

    async readdir(filePath: string): Promise<string[]> {
        return fs.promises.readdir(filePath);
    }

    async unlink(filePath: string): Promise<void> {
        await fs.promises.unlink(filePath);
    }

    async stat(filePath: string): Promise<{ isDirectory(): boolean }> {
        return fs.promises.stat(filePath);
    }
}

/**
 * Node.js环境的环境变量提供者实现
 */
export class NodeEnvProvider implements EnvProvider {
    get(key: string, defaultValue?: string): string | undefined {
        return process.env[key] || defaultValue;
    }

    set(key: string, value: string): void {
        process.env[key] = value;
    }

    getAll(): Record<string, string> {
        return { ...process.env } as Record<string, string>;
    }
}

/**
 * Node.js环境的路径工具实现
 */
export class NodePathUtils implements PathUtils {
    join(...paths: string[]): string {
        return path.join(...paths);
    }

    resolve(...paths: string[]): string {
        return path.resolve(...paths);
    }

    dirname(pathStr: string): string {
        return path.dirname(pathStr);
    }

    basename(pathStr: string): string {
        return path.basename(pathStr);
    }

    extname(pathStr: string): string {
        return path.extname(pathStr);
    }
}

/**
 * Node.js环境的平台信息实现
 */
export class NodePlatformInfo implements PlatformInfo {
    homeDir(): string {
        return os.homedir();
    }

    platform(): string {
        return process.platform;
    }

    isNode(): boolean {
        return true;
    }

    isBrowser(): boolean {
        return false;
    }

    tmpdir(): string {
        return os.tmpdir();
    }

    cwd(): string {
        return process.cwd();
    }
}

/**
 * Node.js环境的平台服务实现
 */
export class NodePlatformServices implements PlatformServices {
    type: PlatformType = PlatformType.NODE;
    fs: FileSystem = new NodeFileSystem();
    env: EnvProvider = new NodeEnvProvider();
    path: PathUtils = new NodePathUtils();
    platformInfo: PlatformInfo = new NodePlatformInfo();
}

/**
 * Node.js环境的平台服务工厂
 */
export class NodePlatformServiceFactory {
    create(): PlatformServices {
        return new NodePlatformServices();
    }
}
