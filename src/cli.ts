#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import { OpenAIModel } from './models/OpenAIModel';
import { AISystem } from './core/AISystem';
import { Config } from './types';
import { ChatCommand } from './commands/chat';
import { GoalCommand } from './commands/goals';
import { MemoryCommand } from './commands/memory';
import { validateConfig, parseNumber } from './utils/config';
import { Logger, LogLevel } from './utils/logger';
import { wrapError } from './utils/errors';

// 加载环境变量
dotenv.config();

// 创建命令行程序
const program = new Command();

program
    .name('agentkai')
    .description('凯 - AI代理系统命令行工具')
    .version('1.0.0')
    .option('-l, --log-level <level>', '设置日志级别 (debug, info, warn, error, silent)', 'info')
    .hook('preAction', (thisCommand) => {
        const options = thisCommand.opts();
        // 设置全局日志级别
        Logger.setGlobalLogLevel(options.logLevel);
    })
    .addHelpText('after', `
示例:
  # 以INFO级别运行聊天命令（默认）
  $ agentkai chat

  # 以DEBUG级别运行聊天命令（方法1：使用全局选项）
  $ agentkai --log-level debug chat

  # 以DEBUG级别运行聊天命令（方法2：使用命令特定选项）
  $ agentkai chat --debug

  # 以WARN级别运行所有命令，减少输出
  $ agentkai --log-level warn chat

  # 完全禁用日志输出（仅显示命令结果）
  $ agentkai --log-level silent memory --list
`);

// 解析命令行选项但不执行命令，以便尽早设置日志级别
// 针对帮助和版本命令特殊处理
const options = program.opts();
if (process.argv.includes('-h') || process.argv.includes('--help') || 
    process.argv.includes('-V') || process.argv.includes('--version')) {
    Logger.setGlobalLogLevel(options.logLevel || 'info');
}

// 创建日志记录器（在处理完命令行参数后）
const logger = new Logger('CLI');

// 创建配置
const config: Config = {
    modelConfig: {
        model: process.env.AI_MODEL_NAME || 'qwen-max-latest',
        apiKey: process.env.AI_API_KEY || '',
        modelName: process.env.AI_MODEL_NAME || 'qwen-max-latest',
        maxTokens: parseNumber(process.env.AI_MAX_TOKENS, 2000, { min: 100, max: 100000 }),
        temperature: parseNumber(process.env.AI_TEMPERATURE, 0.7, { min: 0, max: 2 }),
        apiBaseUrl: process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
        embeddingModel: process.env.AI_EMBEDDING_MODEL || 'text-embedding-v1',
        embeddingBaseUrl: process.env.AI_EMBEDDING_BASE_URL || process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
    },
    memoryConfig: {
        vectorDimensions: 1024,
        maxMemories: parseNumber(process.env.MEMORY_MAX_SIZE, 1000, { min: 10 }),
        similarityThreshold: parseNumber(process.env.MEMORY_SIMILARITY_THRESHOLD, 0.6, { min: 0, max: 1 }),
        shortTermCapacity: parseNumber(process.env.MEMORY_SHORT_TERM_CAPACITY, 10, { min: 1 }),
        importanceThreshold: parseNumber(process.env.MEMORY_IMPORTANCE_THRESHOLD, 0.5, { min: 0, max: 1 }),
    },
    decisionConfig: {
        confidenceThreshold: parseNumber(process.env.DECISION_CONFIDENCE_THRESHOLD, 0.7, { min: 0, max: 1 }),
        maxRetries: parseNumber(process.env.DECISION_MAX_RETRIES, 3, { min: 0 }),
        maxReasoningSteps: parseNumber(process.env.DECISION_MAX_REASONING_STEPS, 5, { min: 1 }),
        minConfidenceThreshold: parseNumber(process.env.DECISION_MIN_CONFIDENCE_THRESHOLD, 0.6, { min: 0, max: 1 }),
    },
};

// 验证配置
try {
    validateConfig(config);
    logger.debug('配置验证通过');
    logger.debug('当前配置详情', config);
} catch (err) {
    logger.error('配置验证失败', err);
    process.exit(1);
}

// 初始化AI系统
let aiSystem: AISystem | null = null;

async function getAISystem(): Promise<AISystem> {
    if (!aiSystem) {
        const model = new OpenAIModel(config.modelConfig);
        aiSystem = new AISystem(config, model);
        try {
            await aiSystem.initialize();
            logger.info('系统初始化完成');
            logger.debug('当前日志级别', { level: Logger.getGlobalLogLevelName() });
        } catch (error) {
            const wrappedError = wrapError(error, '系统初始化失败');
            logger.error('系统初始化失败', wrappedError);
            throw wrappedError;
        }
    }
    return aiSystem;
}

// 注册聊天命令
program
    .command('chat')
    .description('与AI代理进行对话')
    .option('-d, --debug', '使用DEBUG日志级别运行聊天', false)
    .action(async (options) => {
        try {
            // 如果指定了debug选项，临时设置日志级别为DEBUG
            if (options.debug) {
                const previousLevel = Logger.getGlobalLogLevel();
                Logger.setGlobalLogLevel(LogLevel.DEBUG);
                logger.info('临时设置日志级别为DEBUG');
                
                // 创建退出钩子，恢复之前的日志级别
                process.on('exit', () => {
                    Logger.setGlobalLogLevel(previousLevel);
                });
            }
            
            const system = await getAISystem();
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
    .option('-p, --progress <id> <progress>', '更新目标进度 (0-1)')
    .option('-s, --status <id> <status>', '更新目标状态 (active/pending/completed/failed)')
    .option('-r, --remove <id>', '删除目标')
    .option('-d, --debug', '使用DEBUG日志级别运行命令', false)
    .action(async (options) => {
        try {
            // 如果指定了debug选项，临时设置日志级别为DEBUG
            if (options.debug) {
                const previousLevel = Logger.getGlobalLogLevel();
                Logger.setGlobalLogLevel(LogLevel.DEBUG);
                logger.info('临时设置日志级别为DEBUG');
                
                // 创建退出钩子，恢复之前的日志级别
                process.on('exit', () => {
                    Logger.setGlobalLogLevel(previousLevel);
                });
            }
            
            const system = await getAISystem();
            const command = new GoalCommand(system);
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
            // 如果指定了debug选项，临时设置日志级别为DEBUG
            if (options.debug) {
                const previousLevel = Logger.getGlobalLogLevel();
                Logger.setGlobalLogLevel(LogLevel.DEBUG);
                logger.info('临时设置日志级别为DEBUG');
                
                // 创建退出钩子，恢复之前的日志级别
                process.on('exit', () => {
                    Logger.setGlobalLogLevel(previousLevel);
                });
            }
            
            logger.debug('memory命令', options);
            const system = await getAISystem();
            const command = new MemoryCommand(system);
            await command.execute(options);
        } catch (error) {
            const wrappedError = wrapError(error, '记忆管理命令执行失败');
            logger.error('记忆管理命令执行失败', wrappedError);
            process.exit(1);
        }
    });

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error('未处理的Promise拒绝', reason);
    // 不退出进程，只记录错误
});

// 解析命令行参数
program.parse(process.argv);
