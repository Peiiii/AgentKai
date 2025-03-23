/**
 * Node.js环境平台抽象层实现包
 */
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import {
  PlatformServices,
  PlatformType,
  FileSystem,
  EnvProvider,
  PathUtils,
  PlatformInfo
} from '@agentkai/core';

/**
 * Node.js环境的文件系统实现
 */
class NodeFileSystem implements FileSystem {
  async readFile(path: string): Promise<string> {
    try {
      return await fs.readFile(path, 'utf-8');
    } catch (error) {
      throw new Error(`无法读取文件: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async writeFile(path: string, data: string): Promise<void> {
    try {
      await fs.writeFile(path, data, 'utf-8');
    } catch (error) {
      throw new Error(`无法写入文件: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
  
  async mkdir(path: string, _options?: { recursive: boolean }): Promise<void> {
    try {
      await fs.mkdir(path, { recursive: _options?.recursive ?? true });
    } catch (error) {
      throw new Error(`无法创建目录: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async readdir(path: string): Promise<string[]> {
    try {
      return await fs.readdir(path);
    } catch (error) {
      throw new Error(`无法读取目录: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async unlink(path: string): Promise<void> {
    try {
      await fs.unlink(path);
    } catch (error) {
      throw new Error(`无法删除文件: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async stat(path: string): Promise<{ isDirectory(): boolean }> {
    try {
      return await fs.stat(path);
    } catch (error) {
      throw new Error(`无法获取文件状态: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Node.js环境的环境变量提供者实现
 */
class NodeEnvProvider implements EnvProvider {
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
class NodePathUtils implements PathUtils {
  join(...paths: string[]): string {
    return path.join(...paths);
  }
  
  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }
  
  dirname(pathString: string): string {
    return path.dirname(pathString);
  }
  
  basename(pathString: string): string {
    return path.basename(pathString);
  }
  
  extname(pathString: string): string {
    return path.extname(pathString);
  }
}

/**
 * Node.js环境的平台信息实现
 */
class NodePlatformInfo implements PlatformInfo {
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
 * Node.js环境平台服务实现
 */
const nodePlatform: PlatformServices = {
  type: PlatformType.NODE,
  fs: new NodeFileSystem(),
  env: new NodeEnvProvider(),
  path: new NodePathUtils(),
  platformInfo: new NodePlatformInfo()
};

export default nodePlatform; 