/**
 * 性能监控工具，用于记录操作执行时间
 */
export declare class PerformanceMonitor {
    private timers;
    private logger;
    constructor(moduleName: string);
    /**
     * 开始计时
     */
    start(label: string): void;
    /**
     * 结束计时并返回持续时间(毫秒)
     */
    end(label: string): number;
    /**
     * 测量函数执行时间的包装器
     */
    measure<T>(label: string, fn: () => Promise<T>): Promise<T>;
    /**
     * 获取活跃的计时器标签
     */
    getActiveTimers(): string[];
    /**
     * 清除所有计时器
     */
    clearTimers(): void;
}
