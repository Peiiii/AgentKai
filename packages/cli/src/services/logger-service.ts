import { Logger, LogLevel } from '@agentkai/core';

/**
 * 处理日志配置的服务
 */
export class LoggerService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('LoggerService');
  }

  /**
   * 根据命令选项设置全局日志级别
   * @param options 命令选项
   */
  setLogLevelFromOptions(options: any): LogLevel {
    const previousLevel = Logger.getGlobalLogLevel();

    if (options.debug) {
      // debug选项优先级高于log-level选项
      Logger.setGlobalLogLevel(LogLevel.DEBUG);
      this.logger.info('设置日志级别为DEBUG');
    } else if (options.logLevel) {
      // 根据--log-level选项设置日志级别
      const logLevelMap: { [key: string]: LogLevel } = {
        debug: LogLevel.DEBUG,
        info: LogLevel.INFO,
        warn: LogLevel.WARN,
        error: LogLevel.ERROR,
        silent: LogLevel.SILENT
      };

      const logLevel = logLevelMap[options.logLevel.toLowerCase()] || LogLevel.WARN;
      Logger.setGlobalLogLevel(logLevel);
      this.logger.info(`设置日志级别为${LogLevel[logLevel]}`);
    }

    // 设置日志格式选项
    this.configureLoggerFormat(options);

    return previousLevel;
  }

  /**
   * 配置日志格式
   * @param options 日志选项
   */
  configureLoggerFormat(_options: any): void {
    const currentLogLevel = Logger.getGlobalLogLevel();
    
    Logger.setGlobalOptions({
      enableColors: true,
      showTimestamp: currentLogLevel === LogLevel.DEBUG, // 只在调试模式下显示时间戳
      showLogLevel: currentLogLevel !== LogLevel.SILENT, // 静默模式下不显示日志级别
      showModule: currentLogLevel === LogLevel.DEBUG || currentLogLevel === LogLevel.INFO, // 仅在DEBUG或INFO模式下显示模块名
    });
  }

  /**
   * 恢复到指定的日志级别
   * @param level 要恢复的日志级别
   */
  restoreLogLevel(level: LogLevel): void {
    Logger.setGlobalLogLevel(level);
  }

  /**
   * 简化日志输出，用于UI友好输出
   */
  simplifyLoggerForUI(): void {
    const originalOptions = Logger.getGlobalOptions();
    Logger.setGlobalOptions({
      ...originalOptions,
      showTimestamp: false,
      showLogLevel: false,
      showModule: false,
    });
  }

  /**
   * 恢复日志选项
   * @param options 原始选项 
   */
  restoreLoggerOptions(options: any): void {
    Logger.setGlobalOptions(options);
  }
} 