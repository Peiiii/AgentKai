import { Logger, LoggerOptions, LogLevel } from './logger';

/**
 * 日志中间件，提供临时修改日志配置的方法
 */
export class LoggingMiddleware {
  /**
   * 创建临时日志上下文
   * @param callback 在临时日志配置中执行的回调函数
   * @param options 临时日志配置
   * @returns 回调函数的返回值
   */
  static async withContext<T>(
    callback: () => Promise<T>,
    options: Partial<LoggerOptions>
  ): Promise<T> {
    const originalOptions = Logger.getGlobalOptions();
    
    try {
      Logger.setGlobalOptions({...originalOptions, ...options});
      return await callback();
    } finally {
      Logger.setGlobalOptions(originalOptions);
    }
  }
  
  /**
   * 在静默日志模式下执行操作
   * @param callback 要执行的操作
   * @returns 回调函数的返回值
   */
  static async withSilentLogs<T>(callback: () => Promise<T>): Promise<T> {
    return LoggingMiddleware.withContext(callback, {
      showLogLevel: false,
      showTimestamp: false,
      showModule: false
    });
  }
  
  /**
   * 在UI操作上下文中执行操作，临时抑制非错误日志
   * @param callback 要执行的操作
   * @returns 回调函数的返回值
   */
  static async withUIContext<T>(callback: () => Promise<T>): Promise<T> {
    const originalLevel = Logger.getGlobalLogLevel();
    try {
      Logger.setGlobalLogLevel(LogLevel.ERROR); // 只显示错误日志
      return await callback();
    } finally {
      Logger.setGlobalLogLevel(originalLevel);
    }
  }
  
  /**
   * 在调试模式下执行操作
   * @param callback 要执行的操作
   * @returns 回调函数的返回值
   */
  static async withDebugContext<T>(callback: () => Promise<T>): Promise<T> {
    const originalLevel = Logger.getGlobalLogLevel();
    try {
      Logger.setGlobalLogLevel(LogLevel.DEBUG);
      return await callback();
    } finally {
      Logger.setGlobalLogLevel(originalLevel);
    }
  }
} 