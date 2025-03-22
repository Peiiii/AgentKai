/**
 * 应用错误基类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR'
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * 工具错误
 */
export class ToolError extends AppError {
  constructor(
    message: string,
    code: string = 'TOOL_ERROR',
    public toolId?: string
  ) {
    super(message, code);
  }
}

/**
 * 记忆系统错误
 */
export class MemoryError extends AppError {
  constructor(
    message: string,
    code: string = 'MEMORY_ERROR'
  ) {
    super(message, code);
  }
}

/**
 * 目标系统错误
 */
export class GoalError extends AppError {
  constructor(
    message: string,
    code: string = 'GOAL_ERROR',
    public goalId?: string
  ) {
    super(message, code);
  }
}

/**
 * 模型错误
 */
export class ModelError extends AppError {
  constructor(
    message: string,
    code: string = 'MODEL_ERROR'
  ) {
    super(message, code);
  }
}

/**
 * 包装未知错误为AppError
 */
export function wrapError(error: unknown, defaultMessage = '发生未知错误'): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(error.message);
  }
  
  return new AppError(typeof error === 'string' ? error : defaultMessage);
} 