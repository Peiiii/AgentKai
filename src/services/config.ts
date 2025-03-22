import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

/**
 * 统一配置服务，负责管理所有配置
 */
export class ConfigService {
  private static instance: ConfigService;
  private config: Map<string, any> = new Map();
  private logger: Logger;
  
  private constructor() {
    this.logger = new Logger('ConfigService');
  }
  
  /**
   * 获取ConfigService单例
   */
  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }
  
  /**
   * 初始化配置服务
   */
  async initialize(): Promise<void> {
    await this.loadAllConfigs();
  }
  
  /**
   * 加载所有配置
   * 按优先级从低到高加载：默认配置 < 包信息 < 环境变量 < 用户配置
   */
  private async loadAllConfigs(): Promise<void> {
    try {
      // 加载默认配置
      this.loadDefaultConfig();
      
      // 加载包信息
      await this.loadPackageInfo();
      
      // 加载环境变量
      this.loadEnvironmentVars();
      
      // 加载用户配置
      await this.loadUserConfig();
      
      this.logger.debug('配置加载完成', {
        configKeys: Array.from(this.config.keys())
      });
    } catch (error) {
      this.logger.error('加载配置失败', error);
    }
  }
  
  /**
   * 加载默认配置
   */
  private loadDefaultConfig(): void {
    // 应用默认配置
    this.config.set('app.name', '凯');
    this.config.set('app.dataPath', path.join(process.env.HOME || process.env.USERPROFILE || '.', '.agentkai', 'data'));
    this.config.set('memory.maxItems', 1000);
    this.config.set('memory.vectorDimension', 1536);
    this.config.set('ui.colorEnabled', true);
  }
  
  /**
   * 加载package.json信息
   */
  private async loadPackageInfo(): Promise<void> {
    try {
      // 可能的包路径
      const possiblePaths = [
        path.resolve(__dirname, '../../../package.json'), // 开发环境
        path.resolve(__dirname, '../../package.json'),    // npm包安装环境
        path.resolve(process.cwd(), 'package.json')       // 当前工作目录
      ];
      
      // 尝试读取package.json
      for (const pkgPath of possiblePaths) {
        if (fs.existsSync(pkgPath)) {
          const packageData = JSON.parse(await fs.promises.readFile(pkgPath, 'utf8'));
          if (packageData.name === 'agentkai') {
            this.config.set('version', packageData.version);
            this.config.set('name', packageData.name);
            this.config.set('description', packageData.description);
            break;
          }
        }
      }
    } catch (error) {
      this.logger.error('无法加载package信息', error);
    }
  }
  
  /**
   * 加载环境变量
   */
  private loadEnvironmentVars(): void {
    // 从环境变量加载配置
    if (process.env.APP_NAME) {
      this.config.set('app.name', process.env.APP_NAME);
    }
    
    if (process.env.APP_DATA_PATH) {
      this.config.set('app.dataPath', process.env.APP_DATA_PATH);
    }
    
    if (process.env.LOG_LEVEL) {
      this.config.set('logging.level', process.env.LOG_LEVEL);
    }
    
    if (process.env.OPENAI_API_KEY) {
      this.config.set('openai.apiKey', process.env.OPENAI_API_KEY);
    }
  }
  
  /**
   * 加载用户配置
   */
  private async loadUserConfig(): Promise<void> {
    // 用户配置文件路径
    const userConfigPath = path.join(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.agentkai', 
      'config.json'
    );
    
    try {
      if (fs.existsSync(userConfigPath)) {
        const userConfig = JSON.parse(await fs.promises.readFile(userConfigPath, 'utf8'));
        
        // 将用户配置转换为Map条目
        this.flattenObject(userConfig, '');
      }
    } catch (error) {
      this.logger.error('加载用户配置失败', error);
    }
  }
  
  /**
   * 将嵌套对象打平为Map键值对
   * @param obj 要打平的对象
   * @param prefix 键前缀
   */
  private flattenObject(obj: Record<string, any>, prefix: string): void {
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // 递归处理嵌套对象
        this.flattenObject(obj[key], fullKey);
      } else {
        // 存储值
        this.config.set(fullKey, obj[key]);
      }
    }
  }
  
  /**
   * 获取配置值
   * @param key 配置键
   * @param defaultValue 默认值
   * @returns 配置值或默认值
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    return this.config.has(key) ? this.config.get(key) : defaultValue;
  }
  
  /**
   * 获取版本号
   * @returns 版本号或"未知"
   */
  getVersion(): string {
    return this.get('version', '未知') || '未知';
  }
  
  /**
   * 获取AI助手名称
   * @returns AI助手名称
   */
  getAIName(): string {
    return this.get('app.name', '凯') || '凯';
  }
  
  /**
   * 获取数据存储路径
   * @returns 数据存储路径
   */
  getDataPath(): string {
    return this.get('app.dataPath', path.join(process.env.HOME || process.env.USERPROFILE || '.', '.agentkai', 'data')) || 
      path.join(process.env.HOME || process.env.USERPROFILE || '.', '.agentkai', 'data');
  }
  
  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   */
  set<T>(key: string, value: T): void {
    this.config.set(key, value);
  }
  
  /**
   * 保存当前配置到用户配置文件
   */
  async saveConfig(): Promise<void> {
    const userConfigDir = path.join(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.agentkai'
    );
    
    const userConfigPath = path.join(userConfigDir, 'config.json');
    
    try {
      // 确保目录存在
      if (!fs.existsSync(userConfigDir)) {
        await fs.promises.mkdir(userConfigDir, { recursive: true });
      }
      
      // 将Map转换为嵌套对象
      const configObj = this.mapToObject();
      
      // 写入配置文件
      await fs.promises.writeFile(
        userConfigPath,
        JSON.stringify(configObj, null, 2),
        'utf8'
      );
      
      this.logger.info('配置已保存到', userConfigPath);
    } catch (error) {
      this.logger.error('保存配置失败', error);
      throw error;
    }
  }
  
  /**
   * 将Map转换为嵌套对象
   * @returns 嵌套配置对象
   */
  private mapToObject(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of this.config.entries()) {
      // 处理嵌套键
      const parts = key.split('.');
      let current = result;
      
      // 创建嵌套结构
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      // 设置最终值
      const lastKey = parts[parts.length - 1];
      current[lastKey] = value;
    }
    
    return result;
  }
} 