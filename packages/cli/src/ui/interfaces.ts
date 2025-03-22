/**
 * 用户界面接口，定义与用户交互的方法
 * 这允许我们支持不同类型的用户界面实现（控制台、GUI等）
 */
export interface UserInterface {
  /**
   * 显示欢迎信息
   * @param version 当前版本号
   */
  showWelcome(version: string): void;
  
  /**
   * 显示用户输入提示
   */
  showPrompt(): void;
  
  /**
   * 获取用户输入
   * @returns 用户输入的字符串
   */
  getInput(): Promise<string>;
  
  /**
   * 显示AI响应内容
   * @param response AI的回复内容
   * @param metadata 相关元数据，如token使用情况
   */
  showResponse(response: string, metadata?: Record<string, any>): void;
  
  /**
   * 显示错误信息
   * @param error 错误信息
   */
  showError(error: string): void;
  
  /**
   * 显示信息消息
   * @param message 消息内容
   */
  showInfo(message: string): void;
  
  /**
   * 显示成功消息
   * @param message 消息内容
   */
  showSuccess(message: string): void;
  
  /**
   * 关闭/清理界面
   */
  close(): void;
} 