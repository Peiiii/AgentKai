#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const dotenv_1 = __importDefault(require("dotenv"));
const OpenAIModel_1 = require("./models/OpenAIModel");
const AISystem_1 = require("./core/AISystem");
const chat_1 = require("./commands/chat");
const goals_1 = require("./commands/goals");
const memory_1 = require("./commands/memory");
const config_1 = require("./utils/config");
const logger_1 = require("./utils/logger");
const errors_1 = require("./utils/errors");
// 加载环境变量
dotenv_1.default.config();
// 创建命令行程序
const program = new commander_1.Command();
program
    .name('agentkai')
    .description('凯 - AI代理系统命令行工具')
    .version('1.0.0')
    .option('-l, --log-level <level>', '设置日志级别 (debug, info, warn, error, silent)', 'info')
    .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    // 设置全局日志级别
    logger_1.Logger.setGlobalLogLevel(options.logLevel);
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
    logger_1.Logger.setGlobalLogLevel(options.logLevel || 'info');
}
// 创建日志记录器（在处理完命令行参数后）
const logger = new logger_1.Logger('CLI');
// 创建配置
const config = {
    modelConfig: {
        model: process.env.AI_MODEL_NAME || 'qwen-max-latest',
        apiKey: process.env.AI_API_KEY || '',
        modelName: process.env.AI_MODEL_NAME || 'qwen-max-latest',
        maxTokens: (0, config_1.parseNumber)(process.env.AI_MAX_TOKENS, 2000, { min: 100, max: 100000 }),
        temperature: (0, config_1.parseNumber)(process.env.AI_TEMPERATURE, 0.7, { min: 0, max: 2 }),
        apiBaseUrl: process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
        embeddingModel: process.env.AI_EMBEDDING_MODEL || 'text-embedding-v1',
        embeddingBaseUrl: process.env.AI_EMBEDDING_BASE_URL || process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
    },
    memoryConfig: {
        vectorDimensions: 1024,
        maxMemories: (0, config_1.parseNumber)(process.env.MEMORY_MAX_SIZE, 1000, { min: 10 }),
        similarityThreshold: (0, config_1.parseNumber)(process.env.MEMORY_SIMILARITY_THRESHOLD, 0.6, { min: 0, max: 1 }),
        shortTermCapacity: (0, config_1.parseNumber)(process.env.MEMORY_SHORT_TERM_CAPACITY, 10, { min: 1 }),
        importanceThreshold: (0, config_1.parseNumber)(process.env.MEMORY_IMPORTANCE_THRESHOLD, 0.5, { min: 0, max: 1 }),
    },
    decisionConfig: {
        confidenceThreshold: (0, config_1.parseNumber)(process.env.DECISION_CONFIDENCE_THRESHOLD, 0.7, { min: 0, max: 1 }),
        maxRetries: (0, config_1.parseNumber)(process.env.DECISION_MAX_RETRIES, 3, { min: 0 }),
        maxReasoningSteps: (0, config_1.parseNumber)(process.env.DECISION_MAX_REASONING_STEPS, 5, { min: 1 }),
        minConfidenceThreshold: (0, config_1.parseNumber)(process.env.DECISION_MIN_CONFIDENCE_THRESHOLD, 0.6, { min: 0, max: 1 }),
    },
};
// 验证配置
try {
    (0, config_1.validateConfig)(config);
    logger.debug('配置验证通过');
    logger.debug('当前配置详情', config);
}
catch (err) {
    logger.error('配置验证失败', err);
    process.exit(1);
}
// 初始化AI系统
let aiSystem = null;
async function getAISystem() {
    if (!aiSystem) {
        const model = new OpenAIModel_1.OpenAIModel(config.modelConfig);
        aiSystem = new AISystem_1.AISystem(config, model);
        try {
            await aiSystem.initialize();
            logger.info('系统初始化完成');
            logger.debug('当前日志级别', { level: logger_1.Logger.getGlobalLogLevelName() });
        }
        catch (error) {
            const wrappedError = (0, errors_1.wrapError)(error, '系统初始化失败');
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
            const previousLevel = logger_1.Logger.getGlobalLogLevel();
            logger_1.Logger.setGlobalLogLevel(logger_1.LogLevel.DEBUG);
            logger.info('临时设置日志级别为DEBUG');
            // 创建退出钩子，恢复之前的日志级别
            process.on('exit', () => {
                logger_1.Logger.setGlobalLogLevel(previousLevel);
            });
        }
        const system = await getAISystem();
        const command = new chat_1.ChatCommand(system);
        await command.execute();
    }
    catch (error) {
        const wrappedError = (0, errors_1.wrapError)(error, '聊天命令执行失败');
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
            const previousLevel = logger_1.Logger.getGlobalLogLevel();
            logger_1.Logger.setGlobalLogLevel(logger_1.LogLevel.DEBUG);
            logger.info('临时设置日志级别为DEBUG');
            // 创建退出钩子，恢复之前的日志级别
            process.on('exit', () => {
                logger_1.Logger.setGlobalLogLevel(previousLevel);
            });
        }
        const system = await getAISystem();
        const command = new goals_1.GoalCommand(system);
        await command.execute(options);
    }
    catch (error) {
        const wrappedError = (0, errors_1.wrapError)(error, '目标管理命令执行失败');
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
            const previousLevel = logger_1.Logger.getGlobalLogLevel();
            logger_1.Logger.setGlobalLogLevel(logger_1.LogLevel.DEBUG);
            logger.info('临时设置日志级别为DEBUG');
            // 创建退出钩子，恢复之前的日志级别
            process.on('exit', () => {
                logger_1.Logger.setGlobalLogLevel(previousLevel);
            });
        }
        logger.debug('memory命令', options);
        const system = await getAISystem();
        const command = new memory_1.MemoryCommand(system);
        await command.execute(options);
    }
    catch (error) {
        const wrappedError = (0, errors_1.wrapError)(error, '记忆管理命令执行失败');
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
