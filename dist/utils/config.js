"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigValidationError = void 0;
exports.parseNumber = parseNumber;
exports.parseBoolean = parseBoolean;
exports.validateConfig = validateConfig;
const errors_1 = require("./errors");
/**
 * 配置验证错误
 */
class ConfigValidationError extends errors_1.AppError {
    constructor(message) {
        super(message, 'CONFIG_VALIDATION_ERROR');
    }
}
exports.ConfigValidationError = ConfigValidationError;
/**
 * 安全地将字符串解析为数字
 * @param value 要解析的字符串
 * @param defaultValue 默认值
 * @param options 可选配置项
 * @returns 解析后的数字
 */
function parseNumber(value, defaultValue, options = {}) {
    if (value === undefined)
        return defaultValue;
    const parsed = Number(value);
    if (isNaN(parsed))
        return defaultValue;
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
function parseBoolean(value, defaultValue) {
    if (value === undefined)
        return defaultValue;
    return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
}
/**
 * 验证配置项
 */
function validateConfig(config) {
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
function validateModelConfig(config) {
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
function validateMemoryConfig(config) {
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
function validateDecisionConfig(config) {
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
