/**
 * 平台类型枚举
 */
export enum PlatformType {
  NODE = 'node',
  BROWSER = 'browser',
  UNKNOWN = 'unknown'
}

/**
 * 文件系统接口
 * 提供跨平台的文件操作能力
 */
export interface FileSystem {
  /**
   * 读取文件内容
   * @param path 文件路径
   * @returns 文件内容
   */
  readFile(path: string): Promise<string>;
  
  /**
   * 写入文件内容
   * @param path 文件路径
   * @param data 要写入的数据
   */
  writeFile(path: string, data: string): Promise<void>;
  
  /**
   * 检查文件或目录是否存在
   * @param path 路径
   */
  exists(path: string): Promise<boolean>;
  
  /**
   * 创建目录
   * @param path 目录路径
   * @param options 选项
   */
  mkdir(path: string, options?: { recursive: boolean }): Promise<void>;
  
  /**
   * 读取目录内容
   * @param path 目录路径
   * @returns 目录中的文件和子目录列表
   */
  readdir(path: string): Promise<string[]>;
  
  /**
   * 删除文件
   * @param path 文件路径
   */
  unlink(path: string): Promise<void>;
  
  /**
   * 获取文件或目录信息
   * @param path 路径
   */
  stat(path: string): Promise<{ isDirectory(): boolean }>;
}

/**
 * 环境变量提供者接口
 * 提供跨平台的环境变量访问能力
 */
export interface EnvProvider {
  /**
   * 获取环境变量
   * @param key 环境变量名
   * @param defaultValue 默认值
   */
  get(key: string, defaultValue?: string): string | undefined;
  
  /**
   * 设置环境变量
   * @param key 环境变量名
   * @param value 环境变量值
   */
  set(key: string, value: string): void;
  
  /**
   * 获取所有环境变量
   * @returns 环境变量对象
   */
  getAll(): Record<string, string>;
}

/**
 * 路径工具接口
 * 提供跨平台的路径处理能力
 */
export interface PathUtils {
  /**
   * 连接路径片段
   * @param paths 路径片段
   */
  join(...paths: string[]): string;
  
  /**
   * 解析为绝对路径
   * @param paths 路径片段
   */
  resolve(...paths: string[]): string;
  
  /**
   * 获取路径的目录部分
   * @param path 路径
   */
  dirname(path: string): string;
  
  /**
   * 获取路径的文件名部分
   * @param path 路径
   */
  basename(path: string): string;
  
  /**
   * 获取文件扩展名
   * @param path 路径
   */
  extname(path: string): string;
}

/**
 * 平台信息接口
 * 提供与平台相关的信息
 */
export interface PlatformInfo {
  /**
   * 获取用户主目录
   */
  homeDir(): string;
  
  /**
   * 获取平台名称
   */
  platform(): string;
  
  /**
   * 检查是否运行在Node.js环境
   */
  isNode(): boolean;
  
  /**
   * 检查是否运行在浏览器环境
   */
  isBrowser(): boolean;
  
  /**
   * 获取临时目录
   */
  tmpdir(): string;
  
  /**
   * 获取当前工作目录
   */
  cwd(): string;
}

/**
 * 平台服务集合
 * 整合所有平台相关服务
 */
export interface PlatformServices {
  /**
   * 平台类型
   */
  type: PlatformType;

  /**
   * 文件系统服务
   */
  fs: FileSystem;
  
  /**
   * 环境变量服务
   */
  env: EnvProvider;
  
  /**
   * 路径工具服务
   */
  path: PathUtils;
  
  /**
   * 平台信息服务
   */
  platformInfo: PlatformInfo;
}

/**
 * 平台服务工厂接口
 */
export interface PlatformServiceFactory {
  /**
   * 创建平台服务
   */
  create(): PlatformServices;
} 