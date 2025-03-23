/**
 * 浏览器环境平台抽象层实现包
 */
import {
  PlatformServices,
  PlatformType,
  FileSystem,
  EnvProvider,
  PathUtils,
  PlatformInfo
} from '@agentkai/core';

/**
 * 浏览器环境的文件系统实现，使用IndexedDB
 */
class BrowserFileSystem implements FileSystem {
  private dbName = 'agentkai-fs';
  private dbVersion = 1;
  private storeName = 'files';
  
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(new Error('无法打开IndexedDB数据库'));
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'path' });
        }
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };
    });
  }
  
  async readFile(path: string): Promise<string> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(path);
      
      request.onerror = () => {
        reject(new Error(`无法读取文件: ${path}`));
      };
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.content);
        } else {
          reject(new Error(`文件不存在: ${path}`));
        }
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  }
  
  async writeFile(path: string, data: string): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // 确保路径的目录存在
      const dirPath = path.split('/').slice(0, -1).join('/');
      if (dirPath) {
        this.mkdir(dirPath).catch(console.error);
      }
      
      const request = store.put({
        path,
        content: data,
        isDirectory: false,
        lastModified: new Date()
      });
      
      request.onerror = () => {
        reject(new Error(`无法写入文件: ${path}`));
      };
      
      request.onsuccess = () => {
        resolve();
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  }
  
  async exists(path: string): Promise<boolean> {
    try {
      const db = await this.openDB();
      
      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(path);
        
        request.onsuccess = () => {
          resolve(!!request.result);
        };
        
        request.onerror = () => {
          resolve(false);
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch {
      return false;
    }
  }
  
  async mkdir(path: string, _options?: { recursive: boolean }): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // 创建目录层次结构
      const parts = path.split('/').filter(Boolean);
      let currentPath = '';
      
      for (const part of parts) {
        currentPath += '/' + part;
        
        const dirRequest = store.put({
          path: currentPath,
          content: '',
          isDirectory: true,
          lastModified: new Date()
        });
        
        dirRequest.onerror = () => {
          reject(new Error(`无法创建目录: ${currentPath}`));
        };
      }
      
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
    });
  }
  
  async readdir(path: string): Promise<string[]> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onerror = () => {
        reject(new Error(`无法读取目录: ${path}`));
      };
      
      request.onsuccess = () => {
        const normPath = path.endsWith('/') ? path : path + '/';
        const entries = request.result.filter((entry: any) => {
          // 找出直接子项
          if (!entry.path.startsWith(normPath)) return false;
          const relativePath = entry.path.slice(normPath.length);
          return relativePath && !relativePath.includes('/');
        }).map((entry: any) => entry.path.split('/').pop());
        
        resolve(entries);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  }
  
  async unlink(path: string): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(path);
      
      request.onerror = () => {
        reject(new Error(`无法删除文件: ${path}`));
      };
      
      request.onsuccess = () => {
        resolve();
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  }
  
  async stat(path: string): Promise<{ isDirectory(): boolean }> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(path);
      
      request.onerror = () => {
        reject(new Error(`无法获取文件状态: ${path}`));
      };
      
      request.onsuccess = () => {
        if (request.result) {
          resolve({
            isDirectory: () => !!request.result.isDirectory
          });
        } else {
          reject(new Error(`文件不存在: ${path}`));
        }
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  }
}

/**
 * 浏览器环境的环境变量提供者实现，使用localStorage
 */
class BrowserEnvProvider implements EnvProvider {
  private readonly STORAGE_KEY_PREFIX = 'agentkai_env_';
  
  get(key: string, defaultValue?: string): string | undefined {
    const value = localStorage.getItem(this.STORAGE_KEY_PREFIX + key);
    return value !== null ? value : defaultValue;
  }
  
  set(key: string, value: string): void {
    localStorage.setItem(this.STORAGE_KEY_PREFIX + key, value);
  }
  
  getAll(): Record<string, string> {
    const env: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
        const envKey = key.slice(this.STORAGE_KEY_PREFIX.length);
        const value = localStorage.getItem(key);
        if (value !== null) {
          env[envKey] = value;
        }
      }
    }
    return env;
  }
}

/**
 * 浏览器环境的路径工具实现
 */
class BrowserPathUtils implements PathUtils {
  join(...paths: string[]): string {
    return paths.map(p => p.replace(/^\/+/, '').replace(/\/+$/, '')).join('/');
  }
  
  resolve(...paths: string[]): string {
    // 简单实现，浏览器环境中使用相对路径
    return this.join(...paths);
  }
  
  dirname(path: string): string {
    return path.split('/').slice(0, -1).join('/') || '/';
  }
  
  basename(path: string): string {
    return path.split('/').pop() || '';
  }
  
  extname(path: string): string {
    const basename = this.basename(path);
    const dotIndex = basename.lastIndexOf('.');
    return dotIndex !== -1 ? basename.slice(dotIndex) : '';
  }
}

/**
 * 浏览器环境的平台信息实现
 */
class BrowserPlatformInfo implements PlatformInfo {
  homeDir(): string {
    return '/home';
  }
  
  platform(): string {
    return 'browser';
  }
  
  isNode(): boolean {
    return false;
  }
  
  isBrowser(): boolean {
    return true;
  }
  
  tmpdir(): string {
    return '/tmp';
  }
  
  cwd(): string {
    return '/';
  }
}

/**
 * 浏览器环境平台服务实现
 */
const browserPlatform: PlatformServices = {
  type: PlatformType.BROWSER,
  fs: new BrowserFileSystem(),
  env: new BrowserEnvProvider(),
  path: new BrowserPathUtils(),
  platformInfo: new BrowserPlatformInfo()
};

export default browserPlatform; 