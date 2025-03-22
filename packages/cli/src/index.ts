// 导出CLI的主要组件

// 导出CLI主函数
export { default as runCLI } from './cli';

// 导出命令
export * from './commands/chat';
export * from './commands/memory';
export * from './commands/goals';
export * from './commands/layer-test';

// 导出UI相关工具
export * from './ui/console'; 