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
 * 控制台颜色代码，用于美化输出
 */
export const Colors = {
  // 基础颜色
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  
  // 前景色
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // 特殊效果
  success: '\x1b[32m', // 绿色
  error: '\x1b[31m',   // 红色
  warn: '\x1b[33m',    // 黄色
  info: '\x1b[36m',    // 青色
  debug: '\x1b[90m',   // 灰色
};

/**
 * 日志配置选项
 */
export interface LoggerOptions {
  /** 是否启用彩色输出 */
  enableColors?: boolean;
  /** 是否显示时间戳 */
  showTimestamp?: boolean;
  /** 是否显示日志级别 */
  showLogLevel?: boolean;
  /** 是否显示模块名称 */
  showModule?: boolean;
  /** 时间戳格式化函数 */
  timestampFormatter?: (date: Date) => string;
  /** 自定义格式化整个日志消息 */
  messageFormatter?: (level: LogLevel, module: string, message: string, data?: unknown) => string;
}

// 默认的日志配置
const DEFAULT_LOGGER_OPTIONS: LoggerOptions = {
  enableColors: true,
  showTimestamp: true,
  showLogLevel: true,
  showModule: true,
  timestampFormatter: (date: Date) => date.toISOString(),
};

/**
 * 高级日志工具，支持多种输出格式和颜色
 */
export class Logger {
  private module: string;
  private static globalLogLevel: LogLevel = LogLevel.DEBUG; 
  private static globalOptions: LoggerOptions = { ...DEFAULT_LOGGER_OPTIONS };
  private options: LoggerOptions;

  constructor(moduleName: string, options?: LoggerOptions) {
    this.module = moduleName;
    this.options = { ...Logger.globalOptions, ...options };
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
   * 设置全局日志配置
   */
  static setGlobalOptions(options: LoggerOptions): void {
    Logger.globalOptions = { ...Logger.globalOptions, ...options };
  }

  /**
   * 获取当前全局日志配置
   */
  static getGlobalOptions(): LoggerOptions {
    return { ...Logger.globalOptions };
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

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    // 如果有自定义的消息格式化器，则使用它
    if (this.options.messageFormatter) {
      return this.options.messageFormatter(level, this.module, message, data);
    }
    
    const { enableColors, showTimestamp, showLogLevel, showModule, timestampFormatter } = this.options;
    
    // 构建日志消息的各个部分
    let result = '';
    
    // 添加时间戳
    if (showTimestamp) {
      const timestamp = timestampFormatter ? timestampFormatter(new Date()) : new Date().toISOString();
      result += enableColors ? `${Colors.dim}[${timestamp}]${Colors.reset} ` : `[${timestamp}] `;
    }
    
    // 添加日志级别
    if (showLogLevel) {
      let levelStr: string;
      let color: string;
      
      switch (level) {
        case LogLevel.DEBUG:
          levelStr = 'DEBUG';
          color = Colors.debug;
          break;
        case LogLevel.INFO:
          levelStr = 'INFO';
          color = Colors.info;
          break;
        case LogLevel.WARN:
          levelStr = 'WARN';
          color = Colors.warn;
          break;
        case LogLevel.ERROR:
          levelStr = 'ERROR';
          color = Colors.error;
          break;
        default:
          levelStr = 'UNKNOWN';
          color = Colors.reset;
      }
      
      result += enableColors 
        ? `${color}[${levelStr}]${Colors.reset} `
        : `[${levelStr}] `;
    }
    
    // 添加模块名称
    if (showModule && this.module) {
      result += enableColors
        ? `${Colors.bright}[${this.module}]${Colors.reset} `
        : `[${this.module}] `;
    }
    
    // 添加消息内容
    result += message;
    
    // 如果有额外数据，则添加数据
    if (data !== undefined) {
      const dataStr = typeof data === 'object' 
        ? JSON.stringify(data, null, 2) 
        : String(data);
      
      if (dataStr.length > 0) {
        result += enableColors
          ? ` ${Colors.dim}${dataStr}${Colors.reset}`
          : ` ${dataStr}`;
      }
    }
    
    return result;
  }

  /**
   * 记录信息级别日志
   */
  info(message: string, data?: unknown): void {
    if (Logger.globalLogLevel <= LogLevel.INFO) {
      console.log(this.formatMessage(LogLevel.INFO, message, data));
    }
  }

  /**
   * 记录错误级别日志
   */
  error(message: string, error?: Error | unknown): void {
    if (Logger.globalLogLevel <= LogLevel.ERROR) {
      // 如果是Error对象，则特殊处理
      let errorData: unknown = error;
      if (error instanceof Error) {
        errorData = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      }
      console.error(this.formatMessage(LogLevel.ERROR, message, errorData));
    }
  }

  /**
   * 记录警告级别日志
   */
  warn(message: string, data?: unknown): void {
    if (Logger.globalLogLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage(LogLevel.WARN, message, data));
    }
  }

  /**
   * 记录调试级别日志
   */
  debug(message: string, data?: unknown): void {
    if (Logger.globalLogLevel <= LogLevel.DEBUG) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, data));
    }
  }

  /**
   * 记录带有成功样式的信息
   */
  success(message: string, data?: unknown): void {
    if (Logger.globalLogLevel <= LogLevel.INFO) {
      const formatted = this.formatMessage(LogLevel.INFO, message, data);
      console.log(this.options.enableColors 
        ? `${Colors.success}${formatted}${Colors.reset}`
        : formatted);
    }
  }

  /**
   * 创建一个分组标题，用于标记一组相关日志
   */
  group(title: string): void {
    if (Logger.globalLogLevel <= LogLevel.INFO) {
      const separator = '━'.repeat(Math.min(30, title.length + 10));
      console.log(this.options.enableColors
        ? `\n${Colors.bright}${separator}${Colors.reset}`
        : `\n${separator}`);
      
      console.log(this.options.enableColors
        ? `${Colors.bright}┃ ${title} ┃${Colors.reset}`
        : `┃ ${title} ┃`);
      
      console.log(this.options.enableColors
        ? `${Colors.bright}${separator}${Colors.reset}\n`
        : `${separator}\n`);
    }
  }

  /**
   * 创建一个简单的分隔线
   */
  divider(length = 40): void {
    if (Logger.globalLogLevel <= LogLevel.INFO) {
      const separator = '─'.repeat(length);
      console.log(this.options.enableColors
        ? `${Colors.dim}${separator}${Colors.reset}`
        : separator);
    }
  }

  /**
   * 创建一个带有标题的分隔线
   */
  section(title: string): void {
    if (Logger.globalLogLevel <= LogLevel.INFO) {
      const titleText = ` ${title} `;
      const totalLength = 60;
      const borderLength = Math.floor((totalLength - titleText.length) / 2);
      const leftBorder = '─'.repeat(borderLength);
      const rightBorder = '─'.repeat(totalLength - titleText.length - borderLength);
      
      console.log(this.options.enableColors
        ? `${Colors.dim}${leftBorder}${Colors.reset}${Colors.bright}${titleText}${Colors.reset}${Colors.dim}${rightBorder}${Colors.reset}`
        : `${leftBorder}${titleText}${rightBorder}`);
    }
  }
} 