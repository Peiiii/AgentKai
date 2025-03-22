/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

/**
 * 简单的日志工具，确保日志格式一致
 */
export class Logger {
  private module: string;
  private static globalLogLevel: LogLevel = LogLevel.INFO; // 默认日志级别

  constructor(moduleName: string) {
    this.module = moduleName;
  }

  /**
   * 设置全局日志级别
   */
  static setGlobalLogLevel(level: LogLevel | string): void {
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
    } else {
      Logger.globalLogLevel = level;
    }
  }

  /**
   * 获取当前全局日志级别
   */
  static getGlobalLogLevel(): LogLevel {
    return Logger.globalLogLevel;
  }

  /**
   * 获取当前全局日志级别名称
   */
  static getGlobalLogLevelName(): string {
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

  info(message: string, data?: any): void {
    if (Logger.globalLogLevel <= LogLevel.INFO) {
      const timestamp = new Date().toISOString();
      const dataStr = data ? ` ${JSON.stringify(data)}` : '';
      console.log(`[${timestamp}] [INFO] [${this.module}] ${message}${dataStr}`);
    }
  }

  error(message: string, error?: Error | unknown): void {
    if (Logger.globalLogLevel <= LogLevel.ERROR) {
      const timestamp = new Date().toISOString();
      const errorStr = error instanceof Error ? 
        ` ${error.name}: ${error.message}` : 
        (error ? ` ${String(error)}` : '');
      console.error(`[${timestamp}] [ERROR] [${this.module}] ${message}${errorStr}`);
    }
  }

  warn(message: string, data?: any): void {
    if (Logger.globalLogLevel <= LogLevel.WARN) {
      const timestamp = new Date().toISOString();
      const dataStr = data ? ` ${JSON.stringify(data)}` : '';
      console.warn(`[${timestamp}] [WARN] [${this.module}] ${message}${dataStr}`);
    }
  }

  debug(message: string, data?: any): void {
    if (Logger.globalLogLevel <= LogLevel.DEBUG) {
      const timestamp = new Date().toISOString();
      const dataStr = data ? ` ${JSON.stringify(data)}` : '';
      console.debug(`[${timestamp}] [DEBUG] [${this.module}] ${message}${dataStr}`);
    }
  }
} 