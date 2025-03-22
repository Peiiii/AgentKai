"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelError = exports.GoalError = exports.MemoryError = exports.ToolError = exports.AppError = void 0;
exports.wrapError = wrapError;
/**
 * 应用错误基类
 */
class AppError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR') {
        super(message);
        this.code = code;
        this.name = this.constructor.name;
    }
}
exports.AppError = AppError;
/**
 * 工具错误
 */
class ToolError extends AppError {
    constructor(message, code = 'TOOL_ERROR', toolId) {
        super(message, code);
        this.toolId = toolId;
    }
}
exports.ToolError = ToolError;
/**
 * 记忆系统错误
 */
class MemoryError extends AppError {
    constructor(message, code = 'MEMORY_ERROR') {
        super(message, code);
    }
}
exports.MemoryError = MemoryError;
/**
 * 目标系统错误
 */
class GoalError extends AppError {
    constructor(message, code = 'GOAL_ERROR', goalId) {
        super(message, code);
        this.goalId = goalId;
    }
}
exports.GoalError = GoalError;
/**
 * 模型错误
 */
class ModelError extends AppError {
    constructor(message, code = 'MODEL_ERROR') {
        super(message, code);
    }
}
exports.ModelError = ModelError;
/**
 * 包装未知错误为AppError
 */
function wrapError(error, defaultMessage = '发生未知错误') {
    if (error instanceof AppError) {
        return error;
    }
    if (error instanceof Error) {
        return new AppError(error.message);
    }
    return new AppError(typeof error === 'string' ? error : defaultMessage);
}
