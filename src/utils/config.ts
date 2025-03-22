import { Config, ModelConfig, MemoryConfig, DecisionConfig } from '../types';
import { AppError } from './errors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

/**
 * 配置验证错误
 */
export class ConfigValidationError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIG_VALIDATION_ERROR');
  }
}

/**
 * 安全地将字符串解析为数字
 * @param value 要解析的字符串
 * @param defaultValue 默认值
 * @param options 可选配置项
 * @returns 解析后的数字
 */
export function parseNumber(
  value: string | undefined, 
  defaultValue: number,
  options: { min?: number; max?: number } = {}
): number {
  if (value === undefined) return defaultValue;
  
  const parsed = Number(value);
  if (isNaN(parsed)) return defaultValue;
  
  // 应用边界约束
  if (options.min !== undefined && parsed < options.min) {
    return options.min;
  }
  
  if (options.max !== undefined && parsed > options.max) {
    return options.max;
  }
  
  return parsed;
}

/**
 * 安全地将字符串解析为布尔值
 * @param value 要解析的字符串
 * @param defaultValue 默认值
 * @returns 解析后的布尔值
 */
export function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  
  return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
}

/**
 * 验证配置项
 */
export function validateConfig(config: Config): Config {
  // 验证模型配置
  validateModelConfig(config.modelConfig);
  
  // 验证记忆配置
  validateMemoryConfig(config.memoryConfig);
  
  // 验证决策配置
  validateDecisionConfig(config.decisionConfig);
  
  // 验证应用配置
  validateAppConfig(config.appConfig);
  
  return config;
}

/**
 * 验证模型配置
 */
function validateModelConfig(config: ModelConfig): void {
  if (!config.apiKey) {
    throw new ConfigValidationError(
      'API密钥不能为空。请按照以下步骤设置:\n' +
      '1. 运行 "agentkai config --init" 创建配置文件\n' +
      '2. 运行 "agentkai config --edit" 编辑配置文件\n' +
      '3. 在配置文件中设置 AI_API_KEY=您的API密钥\n' +
      '或者直接运行 "agentkai config --set AI_API_KEY 您的API密钥"'
    );
  }
  
  if (!config.model) {
    throw new ConfigValidationError('模型名称不能为空');
  }
  
  if (!config.apiBaseUrl) {
    throw new ConfigValidationError('API基础URL不能为空');
  }
  
  if (config.maxTokens <= 0) {
    throw new ConfigValidationError('最大Token数必须大于0');
  }
  
  if (config.temperature < 0 || config.temperature > 2) {
    throw new ConfigValidationError('温度参数必须在0-2之间');
  }
}

/**
 * 验证记忆配置
 */
function validateMemoryConfig(config: MemoryConfig): void {
  if (config.vectorDimensions <= 0) {
    throw new ConfigValidationError('向量维度必须大于0');
  }
  
  if (config.maxMemories <= 0) {
    throw new ConfigValidationError('最大记忆数量必须大于0');
  }
  
  if (config.similarityThreshold < 0 || config.similarityThreshold > 1) {
    throw new ConfigValidationError('相似度阈值必须在0-1之间');
  }
  
  if (config.shortTermCapacity <= 0) {
    throw new ConfigValidationError('短期记忆容量必须大于0');
  }
}

/**
 * 验证决策配置
 */
function validateDecisionConfig(config: DecisionConfig): void {
  if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
    throw new ConfigValidationError('信心阈值必须在0-1之间');
  }
  
  if (config.maxRetries < 0) {
    throw new ConfigValidationError('最大重试次数不能为负数');
  }
  
  if (config.maxReasoningSteps <= 0) {
    throw new ConfigValidationError('最大推理步骤必须大于0');
  }
}

/**
 * 验证应用配置
 */
function validateAppConfig(config: any): void {
  if (!config) {
    throw new ConfigValidationError('应用配置不能为空');
  }

  if (!config.name) {
    throw new ConfigValidationError('应用名称不能为空');
  }

  if (!config.version) {
    throw new ConfigValidationError('应用版本不能为空');
  }

  if (!config.defaultLanguage) {
    throw new ConfigValidationError('默认语言不能为空');
  }
}

/**
 * 配置文件位置优先级
 * 1. 当前目录的.env文件
 * 2. 用户主目录下的.agentkai/config文件
 * 3. 全局配置目录下的agentkai/config文件 (例如/etc/agentkai/config)
 */

// 全局配置目录路径
const GLOBAL_CONFIG_DIR = process.platform === 'win32' 
  ? path.join(process.env.ProgramData || 'C:\\ProgramData', 'agentkai')
  : '/etc/agentkai';

// 用户主目录配置路径
const USER_CONFIG_DIR = path.join(os.homedir(), '.agentkai');

/**
 * 查找可用的配置文件位置
 */
export function findConfigFiles(): string[] {
  const configFiles = [];
  
  // 1. 当前目录.env
  const localEnvPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(localEnvPath)) {
    configFiles.push(localEnvPath);
  }
  
  // 2. 用户主目录配置
  const userConfigPath = path.join(USER_CONFIG_DIR, 'config');
  if (fs.existsSync(userConfigPath)) {
    configFiles.push(userConfigPath);
  }
  
  // 3. 全局配置
  const globalConfigPath = path.join(GLOBAL_CONFIG_DIR, 'config');
  if (fs.existsSync(globalConfigPath)) {
    configFiles.push(globalConfigPath);
  }
  
  return configFiles;
}

/**
 * 创建默认的用户配置文件
 */
export function createDefaultUserConfig(): string {
  if (!fs.existsSync(USER_CONFIG_DIR)) {
    fs.mkdirSync(USER_CONFIG_DIR, { recursive: true });
  }
  
  const userConfigPath = path.join(USER_CONFIG_DIR, 'config');
  
  // 如果配置文件不存在，创建默认配置
  if (!fs.existsSync(userConfigPath)) {
    const defaultConfig = `# AgentKai 默认配置文件
# 由系统自动创建于 ${new Date().toLocaleString()}

# AI模型配置
AI_API_KEY=
AI_MODEL_NAME=qwen-max-latest
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_EMBEDDING_MODEL=text-embedding-v3

# 记忆系统配置
MEMORY_MAX_SIZE=1000
MEMORY_SIMILARITY_THRESHOLD=0.6
MEMORY_SHORT_TERM_CAPACITY=10
MEMORY_IMPORTANCE_THRESHOLD=0.5

# 决策系统配置
DECISION_CONFIDENCE_THRESHOLD=0.7
DECISION_MAX_RETRIES=3
DECISION_MAX_REASONING_STEPS=5
DECISION_MIN_CONFIDENCE_THRESHOLD=0.6

# 应用配置
APP_DATA_PATH=${path.join(os.homedir(), '.agentkai', 'data')}
`;
    
    fs.writeFileSync(userConfigPath, defaultConfig, 'utf8');
  }
  
  return userConfigPath;
}

/**
 * 加载所有可用的配置文件
 * 按优先级从低到高加载，这样高优先级的配置可以覆盖低优先级的配置
 */
export function loadAllConfigs(): void {
  const configFiles = findConfigFiles();
  
  // 如果没有找到配置文件，创建默认用户配置
  if (configFiles.length === 0) {
    const defaultConfigPath = createDefaultUserConfig();
    configFiles.push(defaultConfigPath);
  }
  
  // 按优先级从低到高加载配置
  for (const file of configFiles.reverse()) {
    dotenv.config({ path: file });
  }
}

/**
 * 保存配置到用户配置文件
 */
export function saveConfig(configData: Record<string, string>): boolean {
  try {
    // 确保用户配置目录存在
    if (!fs.existsSync(USER_CONFIG_DIR)) {
      fs.mkdirSync(USER_CONFIG_DIR, { recursive: true });
    }
    
    const userConfigPath = path.join(USER_CONFIG_DIR, 'config');
    
    // 读取现有配置或创建新配置
    let configContent = '';
    if (fs.existsSync(userConfigPath)) {
      configContent = fs.readFileSync(userConfigPath, 'utf8');
    }
    
    // 更新配置内容
    for (const [key, value] of Object.entries(configData)) {
      // 检查是否已存在该配置项
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (regex.test(configContent)) {
        // 更新现有配置
        configContent = configContent.replace(regex, `${key}=${value}`);
      } else {
        // 添加新配置
        configContent += `\n${key}=${value}`;
      }
    }
    
    // 写入配置文件
    fs.writeFileSync(userConfigPath, configContent.trim(), 'utf8');
    return true;
  } catch (error) {
    console.error('保存配置失败:', error);
    return false;
  }
} 