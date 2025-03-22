/**
 * 应用错误基类
 */
export declare class AppError extends Error {
    code: string;
    constructor(message: string, code?: string);
}
/**
 * 工具错误
 */
export declare class ToolError extends AppError {
    toolId?: string | undefined;
    constructor(message: string, code?: string, toolId?: string | undefined);
}
/**
 * 记忆系统错误
 */
export declare class MemoryError extends AppError {
    constructor(message: string, code?: string);
}
/**
 * 目标系统错误
 */
export declare class GoalError extends AppError {
    goalId?: string | undefined;
    constructor(message: string, code?: string, goalId?: string | undefined);
}
/**
 * 模型错误
 */
export declare class ModelError extends AppError {
    constructor(message: string, code?: string);
}
/**
 * 包装未知错误为AppError
 */
export declare function wrapError(error: unknown, defaultMessage?: string): AppError;
