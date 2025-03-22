"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = void 0;
const logger_1 = require("./logger");
/**
 * 性能监控工具，用于记录操作执行时间
 */
class PerformanceMonitor {
    constructor(moduleName) {
        this.timers = {};
        this.logger = new logger_1.Logger(`${moduleName}:Performance`);
    }
    /**
     * 开始计时
     */
    start(label) {
        this.timers[label] = Date.now();
    }
    /**
     * 结束计时并返回持续时间(毫秒)
     */
    end(label) {
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
    async measure(label, fn) {
        this.start(label);
        try {
            return await fn();
        }
        finally {
            this.end(label);
        }
    }
    /**
     * 获取活跃的计时器标签
     */
    getActiveTimers() {
        return Object.keys(this.timers);
    }
    /**
     * 清除所有计时器
     */
    clearTimers() {
        this.timers = {};
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
