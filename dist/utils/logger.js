"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
/**
 * 日志级别枚举
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["SILENT"] = 4] = "SILENT";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * 简单的日志工具，确保日志格式一致
 */
class Logger {
    constructor(moduleName) {
        this.module = moduleName;
    }
    /**
     * 设置全局日志级别
     */
    static setGlobalLogLevel(level) {
        if (typeof level === 'string') {
            switch (level.toLowerCase()) {
                case 'debug':
                    Logger.globalLogLevel = LogLevel.DEBUG;
                    break;
                case 'info':
                    Logger.globalLogLevel = LogLevel.INFO;
                    break;
                case 'warn':
                    Logger.globalLogLevel = LogLevel.WARN;
                    break;
                case 'error':
                    Logger.globalLogLevel = LogLevel.ERROR;
                    break;
                case 'silent':
                    Logger.globalLogLevel = LogLevel.SILENT;
                    break;
                default:
                    console.warn(`未知日志级别: ${level}，使用默认级别 INFO`);
                    Logger.globalLogLevel = LogLevel.INFO;
            }
        }
        else {
            Logger.globalLogLevel = level;
        }
    }
    /**
     * 获取当前全局日志级别
     */
    static getGlobalLogLevel() {
        return Logger.globalLogLevel;
    }
    /**
     * 获取当前全局日志级别名称
     */
    static getGlobalLogLevelName() {
        switch (Logger.globalLogLevel) {
            case LogLevel.DEBUG:
                return 'DEBUG';
            case LogLevel.INFO:
                return 'INFO';
            case LogLevel.WARN:
                return 'WARN';
            case LogLevel.ERROR:
                return 'ERROR';
            case LogLevel.SILENT:
                return 'SILENT';
            default:
                return 'UNKNOWN';
        }
    }
    info(message, data) {
        if (Logger.globalLogLevel <= LogLevel.INFO) {
            const timestamp = new Date().toISOString();
            const dataStr = data ? ` ${JSON.stringify(data)}` : '';
            console.log(`[${timestamp}] [INFO] [${this.module}] ${message}${dataStr}`);
        }
    }
    error(message, error) {
        if (Logger.globalLogLevel <= LogLevel.ERROR) {
            const timestamp = new Date().toISOString();
            const errorStr = error instanceof Error ?
                ` ${error.name}: ${error.message}` :
                (error ? ` ${String(error)}` : '');
            console.error(`[${timestamp}] [ERROR] [${this.module}] ${message}${errorStr}`);
        }
    }
    warn(message, data) {
        if (Logger.globalLogLevel <= LogLevel.WARN) {
            const timestamp = new Date().toISOString();
            const dataStr = data ? ` ${JSON.stringify(data)}` : '';
            console.warn(`[${timestamp}] [WARN] [${this.module}] ${message}${dataStr}`);
        }
    }
    debug(message, data) {
        if (Logger.globalLogLevel <= LogLevel.DEBUG) {
            const timestamp = new Date().toISOString();
            const dataStr = data ? ` ${JSON.stringify(data)}` : '';
            console.debug(`[${timestamp}] [DEBUG] [${this.module}] ${message}${dataStr}`);
        }
    }
}
exports.Logger = Logger;
Logger.globalLogLevel = LogLevel.INFO; // 默认日志级别
