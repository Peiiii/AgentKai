import { platform } from '../platform';
import { EnvProvider, FileSystem, PathUtils, PlatformInfo } from '../platform/interfaces';
import { ModelConfig, MemoryConfig, AppConfig, AgentKaiConfig } from '../types/config';
import {
    ConfigValidationError,
} from '../types/config';
import { Logger } from '../utils/logger';

interface ConfigOptions {
    customConfigDir?: string;
}

/**
 * 配置服务，用于管理所有配置
 */
export class ConfigService {
    private static instance: ConfigService;
    private config: Map<string, any> = new Map();
    private logger: Logger;

    // 平台服务
    private fs: FileSystem;
    private env: EnvProvider;
    private pathUtils: PathUtils;
    private platformInfo: PlatformInfo;

    // 配置相关路径
    private configDir: string;
    private dataDir: string;
    private userConfigDir: string;
    private baseDir: string;
    private configPath: string;
    private userConfigPath: string;
    private packageJsonPath: string;

    // 配置数据
    private packageInfo: any = null;
    private defaultConfig: AgentKaiConfig | null = null;
    private userConfig: AgentKaiConfig | null = null;
    private envConfig: AgentKaiConfig | null = null;
    private fullConfig: AgentKaiConfig | null = null;

    // 全局配置目录路径
    private readonly GLOBAL_CONFIG_DIR = this.platformInfo.isNode()
        ? this.platformInfo.platform() === 'win32'
            ? this.pathUtils.join(this.env.get('ProgramData') || 'C:\\ProgramData', 'agentkai')
            : '/etc/agentkai'
        : '/config';

    // 用户主目录配置路径
    private readonly USER_CONFIG_DIR = this.pathUtils.join(
        this.platformInfo.homeDir(),
        '.agentkai'
    );

    private constructor(options: ConfigOptions = {}) {
        this.logger = new Logger('ConfigService');
        // 设置baseDir
        this.baseDir = this.platformInfo.isNode()
            ? this.pathUtils.dirname(this.pathUtils.dirname(__dirname))
            : '/';
        
        const appDataDir = this.getUserAppDataDir();
        this.dataDir = this.pathUtils.join(appDataDir, '.agentkai');
        // 配置目录路径
        this.configDir = this.pathUtils.join(this.dataDir, 'config');
        // 数据目录路径
        // 用户配置目录
        this.userConfigDir = options.customConfigDir || this.pathUtils.join(this.dataDir, 'config');

        // 配置文件路径
        this.configPath = this.pathUtils.join(this.configDir, 'defaults.json');
        this.userConfigPath = this.pathUtils.join(this.userConfigDir, 'config.json');
        this.packageJsonPath = this.pathUtils.join(this.baseDir, 'package.json');
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
    async initialize(): Promise<boolean> {
        this.logger.info('正在初始化配置服务...');
        try {
            // 按优先级从低到高加载配置
            // 1. 默认配置（最低优先级）
            await this.loadDefaultConfig();
            
            // 2. 用户配置（中等优先级）
            await this.loadUserConfig();
            
            // 3. 环境变量配置（最高优先级）
            await this.loadEnvConfig();
            
            // 合并配置 - 按优先级从低到高合并
            this.mergeConfigs();

            // 验证配置
            const validationResult = this.validateConfig();
            
            if (validationResult !== true) {
                this.logger.error('配置验证失败:', validationResult);
                return false;
            }

            this.logger.info('配置服务初始化完成');
            return true;
        } catch (error) {
            this.logger.error('配置服务初始化失败:', error);
            return false;
        }
    }

    /**
     * 获取用户应用数据目录
     * @returns 用户应用数据目录路径
     */
    private getUserAppDataDir(): string {
        const platform = this.platformInfo.platform();
        const homeDir = this.platformInfo.homeDir();

        if (this.platformInfo.isBrowser()) {
            return '/';
        } else if (platform === 'win32') {
            return this.env.get('APPDATA') || this.pathUtils.join(homeDir, 'AppData', 'Roaming');
        } else if (platform === 'darwin') {
            return this.pathUtils.join(homeDir, 'Library', 'Application Support');
        } else {
            return this.env.get('XDG_CONFIG_HOME') || this.pathUtils.join(homeDir, '.config');
        }
    }

    /**
     * 查找所有配置文件
     * @returns 配置文件路径
     */
    async findConfigFiles(): Promise<string[]> {
        return Promise.all(
            [this.configPath, this.userConfigPath].map(async (p) => ({
                path: p,
                exists: await this.fs.exists(p),
            }))
        ).then((results) => results.filter((r) => r.exists).map((r) => r.path));
    }

    /**
     * 加载默认配置
     */
    private async loadDefaultConfig(): Promise<void> {
        try {
            if (await this.fs.exists(this.configPath)) {
                const configData = await this.fs.readFile(this.configPath);
                this.defaultConfig = JSON.parse(configData);
            } else {
                this.defaultConfig = {
                    modelConfig: {
                        model: 'gpt-4o',
                        apiKey: '',
                        temperature: 0.7,
                        maxTokens: 2048,
                        modelName: 'gpt-4o',
                        apiBaseUrl: 'https://api.openai.com/v1',
                        embeddingModel: 'text-embedding-v3',
                        embeddingBaseUrl: 'https://api.openai.com/v1',
                        embeddingDimensions: 1024
                    },
                    memoryConfig: {
                        vectorDimensions: 1024,
                        maxMemories: 1000,
                        similarityThreshold: 0.7,
                        shortTermCapacity: 10,
                        importanceThreshold: 0.5
                    },
                    appConfig: {
                        name: '凯',
                        version: '1.0.0',
                        defaultLanguage: 'zh-CN',
                        dataPath: this.dataDir
                    },
                };
            }
        } catch (error) {
            throw new Error(
                `加载默认配置失败: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * 加载项目包信息
     */
    private async loadPackageInfo(): Promise<void> {
        try {
            if (await this.fs.exists(this.packageJsonPath)) {
                const packageData = await this.fs.readFile(this.packageJsonPath);
                this.packageInfo = JSON.parse(packageData);
            }
        } catch (error) {
            // 包信息加载失败不影响程序运行
            console.warn(
                `加载包信息失败: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * 加载环境变量配置
     */
    private async loadEnvConfig(): Promise<void> {
        const defaultEnvConfig = {
            modelConfig: {
                model: '',
                apiKey: '',
                modelName: '',
                temperature: 0.7,
                maxTokens: 2000,
                apiBaseUrl: '',
                embeddingModel: '',
                embeddingBaseUrl: '',
                embeddingDimensions: 1024
            },
            memoryConfig: {
                vectorDimensions: 1024,
                maxMemories: 1000,
                similarityThreshold: 0.7,
                shortTermCapacity: 10, 
                importanceThreshold: 0.5
            },
            appConfig: {
                name: '',
                version: '',
                defaultLanguage: '',
                dataPath: ''
            }
        } as AgentKaiConfig;

        // 从环境变量加载配置
        const envConfig: Partial<AgentKaiConfig> = {
            modelConfig: {
                // provider: this.env.get('AI_PROVIDER'),
                model: this.env.get('AI_MODEL') || 'qwen-max-latest',
                apiKey: this.env.get('AI_API_KEY') || '',
                temperature: this.parseNumber(this.env.get('AI_TEMPERATURE')) || 0.7,
                maxTokens: this.parseNumber(this.env.get('AI_MAX_TOKENS')) || 2048,
                modelName: this.env.get('AI_MODEL') || 'qwen-max-latest',
                apiBaseUrl: this.env.get('AI_API_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                embeddingModel: this.env.get('AI_EMBEDDING_MODEL') || 'text-embedding-v3',
                embeddingBaseUrl: this.env.get('AI_EMBEDDING_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                embeddingDimensions: this.parseNumber(this.env.get('AI_EMBEDDING_DIMENSIONS')) || 1024
            },
            memoryConfig: {
                vectorDimensions: this.parseNumber(this.env.get('AI_VECTOR_DIMENSIONS')) || 1024,
                maxMemories: this.parseNumber(this.env.get('AI_MAX_MEMORIES')) || 1000,
                similarityThreshold: this.parseNumber(this.env.get('AI_SIMILARITY_THRESHOLD')) || 0.7,
                shortTermCapacity: this.parseNumber(this.env.get('AI_SHORT_TERM_CAPACITY')) || 10,
                importanceThreshold: this.parseNumber(this.env.get('AI_IMPORTANCE_THRESHOLD')) || 0.5
            },
            appConfig: {
                name: this.env.get('AI_NAME') || '凯',
                version: this.env.get('AI_VERSION') || '1.0.0',
                defaultLanguage: this.env.get('AI_DEFAULT_LANGUAGE') || 'zh-CN',
                dataPath: this.env.get('AI_DATA_DIR') || this.dataDir
            },
        };

        // 过滤掉undefined值
        this.envConfig = this.filterUndefinedValues(defaultEnvConfig, envConfig) as AgentKaiConfig;
    }

    /**
     * 过滤掉对象中的undefined值
     */
    private filterUndefinedValues<T>(defaultObj: T, inputObj: Partial<T>): T {
        const result = { ...defaultObj };

        // 递归处理嵌套对象
        for (const key in inputObj) {
            const value = inputObj[key];

            if (value === undefined) {
                continue;
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // 递归处理嵌套对象
                result[key] = this.filterUndefinedValues(result[key] || ({} as any), value as any);
            } else if (value !== undefined) {
                // 非undefined值直接赋值
                result[key as keyof T] = value as T[keyof T];
            }
        }

        return result;
    }

    /**
     * 将字符串解析为数字
     * @param value 要解析的字符串
     * @returns 解析后的数字，如果解析失败则返回undefined
     */
    private parseNumber(value: string | undefined): number | undefined {
        if (value === undefined) return undefined;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? undefined : parsed;
    }

    /**
     * 将字符串解析为布尔值
     * @param value 要解析的字符串
     * @returns 解析后的布尔值，如果解析失败则返回undefined
     */
    private parseBoolean(value: string | undefined): boolean | undefined {
        if (value === undefined) return undefined;
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        return undefined;
    }

    /**
     * 加载用户配置
     */
    async loadUserConfig(): Promise<void> {
        try {
            if (await this.fs.exists(this.userConfigPath)) {
                const userData = await this.fs.readFile(this.userConfigPath);
                this.userConfig = JSON.parse(userData);
            } else {
                this.userConfig = null;
            }
        } catch (error) {
            throw new Error(
                `加载用户配置失败: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * 创建默认用户配置
     * @returns 默认用户配置
     */
    async createDefaultUserConfig(): Promise<{ path: string; config: AgentKaiConfig }> {
        if (!this.defaultConfig) {
            await this.loadDefaultConfig();
        }

        const config: AgentKaiConfig = JSON.parse(
            JSON.stringify(this.defaultConfig)
        ) as AgentKaiConfig;

        // 确保目录存在
        if (!(await this.fs.exists(this.userConfigDir))) {
            await this.fs.mkdir(this.userConfigDir, { recursive: true });
        }

        // 写入默认配置
        await this.fs.writeFile(this.userConfigPath, JSON.stringify(config, null, 2));

        return {
            path: this.userConfigPath,
            config,
        };
    }

    /**
     * 合并所有配置
     */
    private mergeConfigs(): void {
        // 按优先级从低到高合并配置
        // 环境变量 > 用户配置 > 默认配置
        this.fullConfig = {
            modelConfig: {
                ...(this.defaultConfig?.modelConfig || {}),
                ...(this.userConfig?.modelConfig || {}),
                ...(this.envConfig?.modelConfig || {}),
            } as ModelConfig,
            memoryConfig: {
                ...(this.defaultConfig?.memoryConfig || {}),
                ...(this.userConfig?.memoryConfig || {}),
                ...(this.envConfig?.memoryConfig || {}),
            } as MemoryConfig,
            appConfig: {
                ...(this.defaultConfig?.appConfig || {}),
                ...(this.userConfig?.appConfig || {}),
                ...(this.envConfig?.appConfig || {}),
            } as AppConfig,
        };
    }

    /**
     * 验证配置
     * @param config 要验证的配置
     * @returns 验证结果，如果有错误则返回错误信息，否则返回true
     */
    validateConfig(
        config: AgentKaiConfig = this.fullConfig as AgentKaiConfig
    ): true | ConfigValidationError[] {
        if (!config) {
            return [new ConfigValidationError('没有可用的配置')];
        }

        const errors: ConfigValidationError[] = [];

        // 验证模型配置
        const modelErrors = this.validateModelConfig(config.modelConfig);
        if (modelErrors !== true) {
            errors.push(...modelErrors);
        }

        // 验证记忆配置
        const memoryErrors = this.validateMemoryConfig(config.memoryConfig);
        if (memoryErrors !== true) {
            errors.push(...memoryErrors);
        }

        // 验证应用配置
        const appErrors = this.validateAppConfig(config.appConfig);
        if (appErrors !== true) {
            errors.push(...appErrors);
        }

        return errors.length ? errors : true;
    }

    /**
     * 验证模型配置
     * @param config 模型配置
     * @returns 验证结果
     */
    validateModelConfig(config: ModelConfig | undefined): true | ConfigValidationError[] {
        if (!config) {
            return [new ConfigValidationError('模型配置缺失')];
        }

        const errors: ConfigValidationError[] = [];

        if (!config.model) {
            errors.push(new ConfigValidationError('model.model 缺失'));
        }

        if (!config.apiKey) {
            errors.push(new ConfigValidationError('model.apiKey 缺失'));
        }

        return errors.length ? errors : true;
    }

    /**
     * 验证记忆配置
     * @param config 记忆配置
     * @returns 验证结果
     */
    validateMemoryConfig(config: MemoryConfig | undefined): true | ConfigValidationError[] {
        if (!config) {
            return [new ConfigValidationError('记忆配置缺失')];
        }

        const errors: ConfigValidationError[] = [];

        if (config.importanceThreshold < 0 || config.importanceThreshold > 1) {
            errors.push(new ConfigValidationError('memory.importanceThreshold 应在 0 和 1 之间'));
        }

        return errors.length ? errors : true;
    }

    /**
     * 验证应用配置
     * @param config 应用配置
     * @returns 验证结果
     */
    validateAppConfig(config: AppConfig | undefined): true | ConfigValidationError[] {
        if (!config) {
            return [new ConfigValidationError('应用配置缺失')];
        }

        const errors: ConfigValidationError[] = [];

        if (!config.name) {
            errors.push(new ConfigValidationError('app.name 缺失'));
        }

        return errors.length ? errors : true;
    }

    /**
     * 获取完整配置
     * @returns 完整配置
     */
    getFullConfig(): AgentKaiConfig {
        if (!this.fullConfig) {
            throw new Error('配置尚未加载，请先调用 initialize() 方法');
        }
        return this.fullConfig;
    }

    /**
     * 获取数据目录路径
     * @returns 数据目录路径
     */
    getDataDir(): string {
        return this.dataDir;
    }

    /**
     * 获取用户配置目录路径
     * @returns 用户配置目录路径
     */
    getUserConfigDir(): string {
        return this.userConfigDir;
    }

    /**
     * 获取用户配置文件路径
     * @returns 用户配置文件路径
     */
    getUserConfigPath(): string {
        return this.userConfigPath;
    }

    /**
     * 获取模型配置
     * @returns 模型配置
     */
    getModelConfig(): ModelConfig {
        return this.getFullConfig().modelConfig;
    }

    /**
     * 获取记忆配置
     * @returns 记忆配置
     */
    getMemoryConfig(): MemoryConfig {
        return this.getFullConfig().memoryConfig;
    }

    /**
     * 获取应用配置
     * @returns 应用配置
     */
    getAppConfig(): AppConfig {
        return this.getFullConfig().appConfig;
    }

    /**
     * 保存配置到用户配置文件
     * @param config 要保存的配置
     */
    async saveConfig(config: AgentKaiConfig): Promise<boolean> {
        try {
            // 确保目录存在
            if (!(await this.fs.exists(this.userConfigDir))) {
                await this.fs.mkdir(this.userConfigDir, { recursive: true });
            }

            await this.fs.writeFile(this.userConfigPath, JSON.stringify(config, null, 2));

            // 更新内存中的配置
            this.userConfig = config;
            this.mergeConfigs();
            return true;
        } catch (error) {
            throw new Error(
                `保存配置失败: ${error instanceof Error ? error.message : String(error)}`
            );
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
        return (
            this.get(
                'app.dataPath',
                this.pathUtils.join(
                    this.getEnv('HOME') || this.getEnv('USERPROFILE') || '.',
                    '.agentkai',
                    'data'
                )
            ) ||
            this.pathUtils.join(this.getEnv('HOME') || this.getEnv('USERPROFILE') || '.', '.agentkai', 'data')
        );
    }

    /**
     * 获取AI模型配置
     * @returns AI模型配置对象
     */
    getAIModelConfig(): ModelConfig {
        return {
            model: this.get('ai.modelName', 'qwen-max-latest')!,
            apiKey: this.get('ai.apiKey', '')!,
            modelName: this.get('ai.modelName', 'qwen-max-latest')!,
            maxTokens: this.get('ai.maxTokens', 2000)!,
            temperature: this.get('ai.temperature', 0.7)!,
            apiBaseUrl: this.get(
                'ai.apiBaseUrl',
                'https://dashscope.aliyuncs.com/compatible-mode/v1'
            )!,
            embeddingModel: this.get('ai.embeddingModel', 'text-embedding-v3')!,
            embeddingBaseUrl: this.get(
                'ai.embeddingBaseUrl',
                'https://dashscope.aliyuncs.com/compatible-mode/v1'
            )!,
            embeddingDimensions: this.get('ai.embeddingDimensions', 1024)!,
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
     * 获取环境变量，封装process.env访问
     * @param key 环境变量名
     * @param defaultValue 默认值
     * @returns 环境变量值或默认值
     */
    getEnv(key: string, defaultValue: string = ''): string {
        return this.env.get(key, defaultValue) || defaultValue;
    }
}
