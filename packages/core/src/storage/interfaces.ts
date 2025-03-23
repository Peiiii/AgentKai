/**
 * 存储系统相关类型定义
 */

/**
 * 排序配置
 */
export interface SortOptions {
  field: string;
  direction?: 'asc' | 'desc';
}

/**
 * 分页配置
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * 查询配置选项
 */
export interface QueryOptions<T = any> {
  filter?: Partial<T> | Record<string, any>;
  sort?: SortOptions;
  pagination?: PaginationOptions;
}

/**
 * 文件系统错误类
 */
export class FileSystemError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'FileSystemError';
  }
} 