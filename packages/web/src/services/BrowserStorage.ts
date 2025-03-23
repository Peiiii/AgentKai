import browserPlatform from '@agentkai/browser';

/**
 * 基于浏览器文件系统的通用存储类
 * 使用IndexedDB实现数据持久化
 */
export class BrowserStorage<T extends { id: string }> {
  private fs = browserPlatform.fs;
  private path = browserPlatform.path;
  private basePath: string;
  private initialized = false;

  /**
   * 创建存储实例
   * @param basePath 数据存储的基础路径，默认为'/storage'
   * @param name 存储名称，用于在路径中区分不同类型的数据
   */
  constructor(basePath: string = '/storage', name: string) {
    this.basePath = this.path.join(basePath, name);
  }

  /**
   * 初始化存储
   * 确保存储目录存在
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 确保存储目录存在
      if (!await this.fs.exists(this.basePath)) {
        await this.fs.mkdir(this.basePath, { recursive: true });
      }
      this.initialized = true;
      console.log(`BrowserStorage initialized at: ${this.basePath}`);
    } catch (error) {
      console.error(`Failed to initialize storage at ${this.basePath}:`, error);
      throw error;
    }
  }

  /**
   * 保存项目
   * @param item 要保存的项目
   * @returns 保存的项目
   */
  public async save(item: T): Promise<T> {
    await this.ensureInitialized();
    
    const filePath = this.getFilePath(item.id);
    try {
      await this.fs.writeFile(filePath, JSON.stringify(item, null, 2));
      return item;
    } catch (error) {
      console.error(`Failed to save item ${item.id}:`, error);
      throw error;
    }
  }

  /**
   * 批量保存项目
   * @param items 要保存的项目数组
   * @returns 保存的项目数组
   */
  public async saveMany(items: T[]): Promise<T[]> {
    await this.ensureInitialized();
    
    const savePromises = items.map(item => this.save(item));
    return Promise.all(savePromises);
  }

  /**
   * 获取项目
   * @param id 项目ID
   * @returns 项目或null（如果不存在）
   */
  public async get(id: string): Promise<T | null> {
    await this.ensureInitialized();
    
    const filePath = this.getFilePath(id);
    try {
      if (!await this.fs.exists(filePath)) {
        return null;
      }
      const content = await this.fs.readFile(filePath);
      return JSON.parse(content) as T;
    } catch (error) {
      console.error(`Failed to get item ${id}:`, error);
      return null;
    }
  }

  /**
   * 获取所有项目
   * @returns 项目数组
   */
  public async getAll(): Promise<T[]> {
    await this.ensureInitialized();
    
    try {
      const files = await this.fs.readdir(this.basePath);
      const items: T[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const id = file.replace('.json', '');
          const item = await this.get(id);
          if (item) {
            items.push(item);
          }
        }
      }
      
      return items;
    } catch (error) {
      console.error('Failed to get all items:', error);
      return [];
    }
  }

  /**
   * 删除项目
   * @param id 项目ID
   * @returns 是否成功删除
   */
  public async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();
    
    const filePath = this.getFilePath(id);
    try {
      if (!await this.fs.exists(filePath)) {
        return false;
      }
      await this.fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete item ${id}:`, error);
      return false;
    }
  }

  /**
   * 清空存储
   * @returns 是否成功清空
   */
  public async clear(): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      const files = await this.fs.readdir(this.basePath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          await this.fs.unlink(this.path.join(this.basePath, file));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * 确保存储已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * 获取项目文件路径
   * @param id 项目ID
   * @returns 文件路径
   */
  private getFilePath(id: string): string {
    return this.path.join(this.basePath, `${id}.json`);
  }
} 