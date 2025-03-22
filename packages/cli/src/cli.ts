#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import { ChatCommand } from './commands/chat';
import { GoalCommand } from './commands/goals';
import { createLayerTestCommand } from './commands/layer-test';
import { MemoryCommand } from './commands/memory';
import { ConfigCommand } from './commands/config';
import { 
  AISystem, 
  Logger, 
  wrapError
} from '@agentkai/core';

// 导入自定义服务
import { CLIConfigService, SystemService, LoggerService } from './services';

// 加载环境变量
dotenv.config();

// 创建服务实例
const cliConfigService = new CLIConfigService();
const systemService = SystemService.getInstance();
const loggerService = new LoggerService();

// 创建日志记录器
const logger = new Logger('CLI');

// 创建命令行程序
const program = new Command();

// 配置程序
program
    .name('agentkai')
    .description('凯 - AI代理系统命令行工具')
    .version('1.0.0')
    .option('-l, --log-level <level>', '设置日志级别 (debug, info, warn, error, silent)', 'warn')
    .hook('preAction', (thisCommand) => {
        const options = thisCommand.opts();
        // 设置全局日志级别
        Logger.setGlobalLogLevel(options.logLevel);
        
        // 配置日志格式
        loggerService.configureLoggerFormat(options);
    })
    .addHelpText(
        'after',
        `
示例:
  # 以WARN级别运行聊天命令（默认）
  $ agentkai chat

  # 以DEBUG级别运行聊天命令（方法1：使用全局选项）
  $ agentkai --log-level debug chat

  # 以DEBUG级别运行聊天命令（方法2：使用命令特定选项）
  $ agentkai chat --debug

  # 以INFO级别运行所有命令，显示更多信息
  $ agentkai --log-level info chat

  # 完全禁用日志输出（仅显示命令结果）
  $ agentkai --log-level silent memory --list

  # 显示当前数据存储目录
  $ agentkai config --data-path

  # 设置自定义数据存储目录
  $ agentkai config --set APP_DATA_PATH /path/to/your/data
`
    );

// 解析命令行选项但不执行命令，以便尽早设置日志级别
// 针对帮助和版本命令特殊处理
const options = program.opts();
if (
    process.argv.includes('-h') ||
    process.argv.includes('--help') ||
    process.argv.includes('-V') ||
    process.argv.includes('--version')
) {
    Logger.setGlobalLogLevel(options.logLevel || 'info');
}

/**
 * 初始化系统并获取AI系统实例
 */
async function initializeSystem(): Promise<AISystem> {
    try {
        // 1. 初始化配置服务
        await cliConfigService.initialize();
        
        // 2. 验证配置
        const isConfigValid = await cliConfigService.validateAndHandleConfigErrors();
        if (!isConfigValid) {
            process.exit(1);
        }
        
        // 3. 初始化系统
        const config = cliConfigService.getCoreConfigService().getFullConfig();
        return await systemService.initializeSystem(config);
    } catch (error) {
        logger.error('初始化系统失败', error);
        process.exit(1);
    }
}

// 注册聊天命令
program
    .command('chat')
    .description('与AI代理进行对话')
    .option('-d, --debug', '使用DEBUG日志级别运行聊天', false)
    .option('--log-level <level>', '设置日志级别 (debug|info|warn|error)', 'warn')
    .action(async (options) => {
        try {
            // 设置日志级别
            const previousLevel = loggerService.setLogLevelFromOptions(options);

            // 创建退出钩子，恢复之前的日志级别
            process.on('exit', () => {
                loggerService.restoreLogLevel(previousLevel);
            });

            // 初始化系统
            const system = await initializeSystem();
            const command = new ChatCommand(system);
            await command.execute();
        } catch (error) {
            const wrappedError = wrapError(error, '聊天命令执行失败');
            logger.error('聊天命令执行失败', wrappedError);
            process.exit(1);
        }
    });

// 注册目标管理命令
program
    .command('goals')
    .description('目标管理')
    .option('-a, --add <description>', '添加新目标')
    .option('-l, --list', '列出所有目标')
    .option('-c, --complete <id>', '完成目标')
    .option('-p, --progress <value>', '更新目标进度 (格式: ID 0-1)')
    .option('-s, --status <value>', '更新目标状态 (格式: ID active/pending/completed/failed)')
    .option('-r, --remove <id>', '删除目标')
    .option('-d, --debug', '使用DEBUG日志级别运行命令', false)
    .action(async (options) => {
        try {
            // 设置日志级别
            const previousLevel = loggerService.setLogLevelFromOptions(options);

            // 创建退出钩子，恢复之前的日志级别
            process.on('exit', () => {
                loggerService.restoreLogLevel(previousLevel);
            });

            // 初始化系统
            const system = await initializeSystem();
            const command = new GoalCommand(system);

            // 直接输出命令行参数，用于调试
            logger.debug('目标管理命令选项:', options);

            if (options.add) {
                logger.debug('检测到添加目标命令:', options.add);
            }

            await command.execute(options);
        } catch (error) {
            const wrappedError = wrapError(error, '目标管理命令执行失败');
            logger.error('目标管理命令执行失败', wrappedError);
            process.exit(1);
        }
    });

// 注册记忆管理命令
program
    .command('memory')
    .description('记忆管理')
    .option('-a, --add <content>', '添加新记忆')
    .option('-s, --search <query>', '搜索记忆')
    .option('-l, --list', '列出所有记忆')
    .option('-r, --remove <id>', '删除记忆')
    .option('-d, --debug', '使用DEBUG日志级别运行命令', false)
    .action(async (options) => {
        try {
            // 设置日志级别
            const previousLevel = loggerService.setLogLevelFromOptions(options);

            // 创建退出钩子，恢复之前的日志级别
            process.on('exit', () => {
                loggerService.restoreLogLevel(previousLevel);
            });

            logger.debug('memory命令', options);
            
            // 初始化系统
            const system = await initializeSystem();
            const command = new MemoryCommand(system);
            await command.execute(options);
        } catch (error) {
            const wrappedError = wrapError(error, '记忆管理命令执行失败');
            logger.error('记忆管理命令执行失败', wrappedError);
            process.exit(1);
        }
    });

// 注册配置管理命令
program
    .command('config')
    .description('配置管理')
    .option('-l, --list', '列出当前配置')
    .option('-g, --get <key>', '获取指定配置项')
    .option('-s, --set <key> <value>', '设置配置项')
    .option('-i, --init', '初始化用户配置文件')
    .option('-p, --path', '显示配置文件路径')
    .option('-e, --edit', '使用编辑器打开配置文件')
    .option('-d, --debug', '使用DEBUG日志级别运行命令', false)
    .option('--data-path', '显示当前数据存储目录')
    .addHelpText(
        'after',
        `
配置提示:
  默认情况下，数据将存储在 "~/.agentkai/data" 目录下。
  您可以通过设置 APP_DATA_PATH 环境变量或在配置文件中设置来自定义数据存储位置。
  例如: agentkai config --set APP_DATA_PATH /path/to/your/data
        `
    )
    .action(async (options, command) => {
        try {
            // 设置日志级别
            const previousLevel = loggerService.setLogLevelFromOptions(options);

            // 创建退出钩子，恢复之前的日志级别
            process.on('exit', () => {
                loggerService.restoreLogLevel(previousLevel);
            });

            logger.debug('config命令', options);
            
            // 初始化配置服务
            await cliConfigService.initialize();
            
            // 执行配置命令
            const configCommand = new ConfigCommand(cliConfigService);
            await configCommand.execute(options, command.args);
        } catch (error) {
            const wrappedError = wrapError(error, '配置管理命令执行失败');
            logger.error('配置管理命令执行失败', wrappedError);
            process.exit(1);
        }
    });

// 注册三层架构测试命令（仅在开发环境使用）
const layerTestCommand = createLayerTestCommand();
program.addCommand(layerTestCommand);

// 解析命令行参数
program.parse(process.argv);

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error('未处理的Promise拒绝', reason);
    // 不退出进程，只记录错误
});
