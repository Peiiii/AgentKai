import { Config } from '../types';
import { AppError } from './errors';
/**
 * 配置验证错误
 */
export declare class ConfigValidationError extends AppError {
    constructor(message: string);
}
/**
 * 安全地将字符串解析为数字
 * @param value 要解析的字符串
 * @param defaultValue 默认值
 * @param options 可选配置项
 * @returns 解析后的数字
 */
export declare function parseNumber(value: string | undefined, defaultValue: number, options?: {
    min?: number;
    max?: number;
}): number;
/**
 * 安全地将字符串解析为布尔值
 * @param value 要解析的字符串
 * @param defaultValue 默认值
 * @returns 解析后的布尔值
 */
export declare function parseBoolean(value: string | undefined, defaultValue: boolean): boolean;
/**
 * 验证配置项
 */
export declare function validateConfig(config: Config): Config;
