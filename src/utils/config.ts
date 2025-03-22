import { Config, ModelConfig, MemoryConfig, DecisionConfig } from '../types';
import { AppError } from './errors';

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
  
  return config;
}

/**
 * 验证模型配置
 */
function validateModelConfig(config: ModelConfig): void {
  if (!config.apiKey) {
    throw new ConfigValidationError('API密钥不能为空');
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