/**
 * 日志级别枚举
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SILENT = 4
}
/**
 * 简单的日志工具，确保日志格式一致
 */
export declare class Logger {
    private module;
    private static globalLogLevel;
    constructor(moduleName: string);
    /**
     * 设置全局日志级别
     */
    static setGlobalLogLevel(level: LogLevel | string): void;
    /**
     * 获取当前全局日志级别
     */
    static getGlobalLogLevel(): LogLevel;
    /**
     * 获取当前全局日志级别名称
     */
    static getGlobalLogLevelName(): string;
    info(message: string, data?: any): void;
    error(message: string, error?: Error | unknown): void;
    warn(message: string, data?: any): void;
    debug(message: string, data?: any): void;
}
