import { Logger } from './logger';

/**
 * 性能监控工具，用于记录操作执行时间
 */
export class PerformanceMonitor {
    private timers: Record<string, number> = {};
    private logger: Logger;
    
    constructor(moduleName: string) {
        this.logger = new Logger(`${moduleName}:Performance`);
    }
    
    /**
     * 开始计时
     */
    start(label: string): void {
        this.timers[label] = Date.now();
    }
    
    /**
     * 结束计时并返回持续时间(毫秒)
     */
    end(label: string): number {
        const startTime = this.timers[label];
        if (startTime === undefined) {
            this.logger.warn(`计时器 ${label} 未启动`);
            return 0;
        }
        
        const duration = Date.now() - startTime;
        this.logger.info(`${label} 完成`, { durationMs: duration });
        delete this.timers[label];
        return duration;
    }
    
    /**
     * 测量函数执行时间的包装器
     */
    async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
        this.start(label);
        try {
            return await fn();
        } finally {
            this.end(label);
        }
    }
    
    /**
     * 获取活跃的计时器标签
     */
    getActiveTimers(): string[] {
        return Object.keys(this.timers);
    }
    
    /**
     * 清除所有计时器
     */
    clearTimers(): void {
        this.timers = {};
    }
} 