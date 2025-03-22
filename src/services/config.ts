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
    this.config.set('app.dataPath', path.join(this.getEnv('HOME') || this.getEnv('USERPROFILE') || '.', '.agentkai', 'data'));
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
    if (this.getEnv('APP_NAME')) {
      this.config.set('app.name', this.getEnv('APP_NAME'));
    }
    
    if (this.getEnv('APP_DATA_PATH')) {
      this.config.set('app.dataPath', this.getEnv('APP_DATA_PATH'));
    }
    
    if (this.getEnv('LOG_LEVEL')) {
      this.config.set('logging.level', this.getEnv('LOG_LEVEL'));
    }
    
    if (this.getEnv('OPENAI_API_KEY')) {
      this.config.set('openai.apiKey', this.getEnv('OPENAI_API_KEY'));
    }
    
    // 加载AI相关配置
    this.loadAIConfigFromEnv();
    
    // 加载记忆系统配置
    this.loadMemoryConfigFromEnv();
    
    // 加载决策系统配置
    this.loadDecisionConfigFromEnv();
  }
  
  /**
   * 从环境变量加载AI配置
   */
  private loadAIConfigFromEnv(): void {
    // AI模型配置
    if (this.getEnv('AI_MODEL_NAME')) {
      this.config.set('ai.modelName', this.getEnv('AI_MODEL_NAME'));
    }
    
    if (this.getEnv('AI_API_KEY')) {
      this.config.set('ai.apiKey', this.getEnv('AI_API_KEY'));
    }
    
    if (this.getEnv('AI_MAX_TOKENS')) {
      this.config.set('ai.maxTokens', this.parseNumber(this.getEnv('AI_MAX_TOKENS'), 2000, { min: 100, max: 100000 }));
    }
    
    if (this.getEnv('AI_TEMPERATURE')) {
      this.config.set('ai.temperature', this.parseNumber(this.getEnv('AI_TEMPERATURE'), 0.7, { min: 0, max: 2 }));
    }
    
    if (this.getEnv('AI_BASE_URL')) {
      this.config.set('ai.apiBaseUrl', this.getEnv('AI_BASE_URL'));
    }
    
    if (this.getEnv('AI_EMBEDDING_MODEL')) {
      this.config.set('ai.embeddingModel', this.getEnv('AI_EMBEDDING_MODEL'));
    }
    
    if (this.getEnv('AI_EMBEDDING_BASE_URL')) {
      this.config.set('ai.embeddingBaseUrl', this.getEnv('AI_EMBEDDING_BASE_URL'));
    } else if (this.getEnv('AI_BASE_URL')) {
      this.config.set('ai.embeddingBaseUrl', this.getEnv('AI_BASE_URL'));
    }
  }
  
  /**
   * 从环境变量加载记忆系统配置
   */
  private loadMemoryConfigFromEnv(): void {
    if (this.getEnv('MEMORY_MAX_SIZE')) {
      this.config.set('memory.maxItems', this.parseNumber(this.getEnv('MEMORY_MAX_SIZE'), 1000, { min: 10 }));
    }
    
    if (this.getEnv('MEMORY_SIMILARITY_THRESHOLD')) {
      this.config.set('memory.similarityThreshold', this.parseNumber(this.getEnv('MEMORY_SIMILARITY_THRESHOLD'), 0.6, { min: 0, max: 1 }));
    }
    
    if (this.getEnv('MEMORY_SHORT_TERM_CAPACITY')) {
      this.config.set('memory.shortTermCapacity', this.parseNumber(this.getEnv('MEMORY_SHORT_TERM_CAPACITY'), 10, { min: 1 }));
    }
    
    if (this.getEnv('MEMORY_IMPORTANCE_THRESHOLD')) {
      this.config.set('memory.importanceThreshold', this.parseNumber(this.getEnv('MEMORY_IMPORTANCE_THRESHOLD'), 0.5, { min: 0, max: 1 }));
    }
  }
  
  /**
   * 从环境变量加载决策系统配置
   */
  private loadDecisionConfigFromEnv(): void {
    if (this.getEnv('DECISION_CONFIDENCE_THRESHOLD')) {
      this.config.set('decision.confidenceThreshold', this.parseNumber(this.getEnv('DECISION_CONFIDENCE_THRESHOLD'), 0.7, { min: 0, max: 1 }));
    }
    
    if (this.getEnv('DECISION_MAX_RETRIES')) {
      this.config.set('decision.maxRetries', this.parseNumber(this.getEnv('DECISION_MAX_RETRIES'), 3, { min: 0 }));
    }
    
    if (this.getEnv('DECISION_MAX_REASONING_STEPS')) {
      this.config.set('decision.maxReasoningSteps', this.parseNumber(this.getEnv('DECISION_MAX_REASONING_STEPS'), 5, { min: 1 }));
    }
    
    if (this.getEnv('DECISION_MIN_CONFIDENCE_THRESHOLD')) {
      this.config.set('decision.minConfidenceThreshold', this.parseNumber(this.getEnv('DECISION_MIN_CONFIDENCE_THRESHOLD'), 0.6, { min: 0, max: 1 }));
    }
  }
  
  /**
   * 加载用户配置
   */
  private async loadUserConfig(): Promise<void> {
    // 用户配置文件路径
    const userConfigPath = path.join(
      this.getEnv('HOME') || this.getEnv('USERPROFILE') || '.',
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
    return this.get('app.dataPath', path.join(this.getEnv('HOME') || this.getEnv('USERPROFILE') || '.', '.agentkai', 'data')) || 
      path.join(this.getEnv('HOME') || this.getEnv('USERPROFILE') || '.', '.agentkai', 'data');
  }
  
  /**
   * 获取AI模型配置
   * @returns AI模型配置对象
   */
  getAIModelConfig(): Record<string, any> {
    return {
      model: this.get('ai.modelName', 'qwen-max-latest'),
      apiKey: this.get('ai.apiKey', ''),
      modelName: this.get('ai.modelName', 'qwen-max-latest'),
      maxTokens: this.get('ai.maxTokens', 2000),
      temperature: this.get('ai.temperature', 0.7),
      apiBaseUrl: this.get('ai.apiBaseUrl', 'https://dashscope.aliyuncs.com/compatible-mode/v1'),
      embeddingModel: this.get('ai.embeddingModel', 'text-embedding-v3'),
      embeddingBaseUrl: this.get('ai.embeddingBaseUrl', 'https://dashscope.aliyuncs.com/compatible-mode/v1')
    };
  }
  
  /**
   * 获取记忆系统配置
   * @returns 记忆系统配置对象
   */
  getMemoryConfig(): Record<string, any> {
    return {
      vectorDimensions: this.get('memory.vectorDimension', 1536),
      maxMemories: this.get('memory.maxItems', 1000),
      similarityThreshold: this.get('memory.similarityThreshold', 0.6),
      shortTermCapacity: this.get('memory.shortTermCapacity', 10),
      importanceThreshold: this.get('memory.importanceThreshold', 0.5)
    };
  }
  
  /**
   * 获取决策系统配置
   * @returns 决策系统配置对象
   */
  getDecisionConfig(): Record<string, any> {
    return {
      confidenceThreshold: this.get('decision.confidenceThreshold', 0.7),
      maxRetries: this.get('decision.maxRetries', 3),
      maxReasoningSteps: this.get('decision.maxReasoningSteps', 5),
      minConfidenceThreshold: this.get('decision.minConfidenceThreshold', 0.6)
    };
  }
  
  /**
   * 获取应用配置
   * @returns 应用配置对象
   */
  getAppConfig(): Record<string, any> {
    return {
      name: this.getAIName(),
      version: this.getVersion(),
      defaultLanguage: this.get('app.defaultLanguage', 'zh-CN'),
      dataPath: this.getDataPath()
    };
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
      this.getEnv('HOME') || this.getEnv('USERPROFILE') || '.',
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
  
  /**
   * 获取环境变量，封装process.env访问
   * @param key 环境变量名
   * @param defaultValue 默认值
   * @returns 环境变量值或默认值
   */
  getEnv(key: string, defaultValue: string = ''): string {
    return process.env[key] || defaultValue;
  }
  
  /**
   * 解析数字类型环境变量
   * @param value 要解析的值
   * @param defaultValue 默认值
   * @param options 解析选项
   * @returns 解析后的数字
   */
  private parseNumber(value: string | undefined, defaultValue: number, options: { min?: number; max?: number } = {}): number {
    if (!value) {
      return defaultValue;
    }
    
    try {
      let num = Number(value);
      
      if (isNaN(num)) {
        return defaultValue;
      }
      
      if (options.min !== undefined) {
        num = Math.max(options.min, num);
      }
      
      if (options.max !== undefined) {
        num = Math.min(options.max, num);
      }
      
      return num;
    } catch (error) {
      return defaultValue;
    }
  }
} 