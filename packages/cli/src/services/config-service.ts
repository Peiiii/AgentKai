import {
    ConfigValidationError,
    BaseConfigService as CoreConfigService,
    Logger,
} from '@agentkai/core';
import { ConfigService } from '@agentkai/node';
import { spawn } from 'child_process';
import fs from 'fs';
import inquirer from 'inquirer';
import * as path from 'path';

/**
 * CLI配置服务，处理命令行工具相关的配置功能
 */
export class CLIConfigService {
    private logger: Logger;
    private coreConfigService: CoreConfigService;
    private USER_CONFIG_DIR: string;

    constructor() {
        this.logger = new Logger('CLIConfigService');
        this.coreConfigService = new ConfigService();
        this.USER_CONFIG_DIR = this.coreConfigService.getUserConfigDir();
    }

    /**
     * 初始化配置服务
     */
    async initialize(): Promise<void> {
        try {
            await this.coreConfigService.initialize();
        } catch (err) {
            this.logger.error('配置服务初始化失败:', err);
            throw err;
        }
    }

    /**
     * 验证配置并处理错误
     */
    async validateAndHandleConfigErrors(): Promise<boolean> {
        try {
            this.coreConfigService.validateConfig();
            this.logger.debug('配置验证通过');
            this.logger.debug('当前配置详情', this.coreConfigService.getFullConfig());
            return true;
        } catch (err) {
            this.logger.error('配置验证失败', err);

            // 检测是否是配置验证错误
            if (err instanceof ConfigValidationError) {
                console.log('\n=============== 配置错误 ===============');
                console.log(err.message);
                console.log('=======================================\n');

                // 自动询问用户是否要初始化配置
                if (err.message.includes('API密钥不能为空') && process.stdout.isTTY) {
                    try {
                        // 确保输入流准备好
                        process.stdin.resume();

                        // 为确保交互正常，添加一个延迟
                        await new Promise((resolve) => setTimeout(resolve, 100));

                        // 使用一个单独的确认提示，确保完成用户交互
                        const shouldConfigure = await new Promise<boolean>((resolve) => {
                            const prompt = inquirer.prompt([
                                {
                                    type: 'confirm',
                                    name: 'shouldConfigure',
                                    message: '是否现在创建或编辑配置文件?',
                                    default: true,
                                },
                            ]);

                            // 添加超时防止永久等待
                            const timeout = setTimeout(() => {
                                console.log('\n等待用户输入超时，假设为"是"...');
                                resolve(true);
                            }, 15000); // 15秒超时

                            prompt
                                .then((answers) => {
                                    clearTimeout(timeout);
                                    resolve(answers.shouldConfigure);
                                })
                                .catch((err) => {
                                    clearTimeout(timeout);
                                    console.error('获取用户确认时出错:', err);
                                    resolve(true); // 默认为是
                                });
                        });

                        if (shouldConfigure) {
                            // 如果用户同意配置，执行配置流程
                            await this.createOrEditConfig();
                        } else {
                            console.log('您可以稍后运行 "agentkai config --init" 初始化配置。');
                        }

                        // 配置完成后退出程序，无论用户是否配置成功
                        console.log('\n配置流程已完成。再次运行命令以使用新配置。');
                        process.exit(0);
                    } catch (error) {
                        this.logger.error('配置流程出错:', error);
                        process.exit(1);
                    } finally {
                        // 确保进程状态正常
                        process.stdin.pause();
                    }
                } else {
                    process.exit(1);
                }
            } else {
                process.exit(1);
            }

            return false;
        }
    }

    /**
     * 创建或编辑配置文件
     */
    async createOrEditConfig(): Promise<void> {
        try {
            console.log('\n开始配置 AgentKai...');

            // 检查配置文件是否存在
            const configFiles = await this.coreConfigService.findConfigFiles();
            if (configFiles.length === 0) {
                // 如果不存在，先创建配置文件
                const configPath = this.coreConfigService.createDefaultUserConfig();
                console.log(`已创建配置文件: ${configPath}`);
            }

            // 为确保交互正常，添加一个延迟
            await new Promise((resolve) => setTimeout(resolve, 100));

            // 确保输入流准备好
            process.stdin.resume();

            console.log('\n请输入您的API密钥信息:');

            // 使用Inquirer的Promise API确保正确处理异步
            const keyAnswer = await new Promise<{ apiKey: string }>((resolve) => {
                const prompt = inquirer.prompt([
                    {
                        type: 'input',
                        name: 'apiKey',
                        message: '请输入您的API密钥 (或按Enter键跳过，稍后手动编辑配置文件):',
                    },
                ]);

                // 添加超时防止永久等待
                const timeout = setTimeout(() => {
                    console.log('\n等待用户输入超时，将打开编辑器...');
                    resolve({ apiKey: '' });
                }, 30000); // 30秒超时

                prompt
                    .then((answer) => {
                        clearTimeout(timeout);
                        resolve(answer);
                    })
                    .catch((err) => {
                        clearTimeout(timeout);
                        console.error('获取用户输入时出错:', err);
                        resolve({ apiKey: '' });
                    });
            });

            if (keyAnswer.apiKey) {
                console.log('\n正在保存API密钥...');
                // 如果用户输入了API密钥，直接保存
                const result = await this.coreConfigService.saveConfig({
                    ...this.coreConfigService.getFullConfig({ allowEmpty: true }),
                    modelConfig: {
                        ...this.coreConfigService.getFullConfig({ allowEmpty: true }).modelConfig,
                        apiKey: keyAnswer.apiKey,
                    },
                });
                if (result) {
                    console.log('✅ API密钥已保存。请重新运行您的命令。');
                } else {
                    console.log('❌ API密钥保存失败，请手动编辑配置文件。');
                }
            } else {
                // 用户跳过了API密钥输入，打开编辑器
                console.log('\n即将打开编辑器，请在编辑器中设置您的API密钥 (AI_API_KEY=您的密钥)');

                // 获取用户配置文件路径
                const userConfigPath = path.join(this.USER_CONFIG_DIR, 'config');

                // 使用更可靠的方式打开编辑器
                const editor =
                    this.coreConfigService.getEnv('EDITOR') ||
                    this.coreConfigService.getEnv('VISUAL') ||
                    (process.platform === 'win32' ? 'notepad.exe' : 'vi');

                console.log(`打开编辑器: ${editor} ${userConfigPath}`);

                // 确保所有输出都被刷新
                await new Promise((resolve) => setTimeout(resolve, 500));

                await new Promise<void>((resolve) => {
                    const child = spawn(editor, [userConfigPath], {
                        stdio: 'inherit',
                        shell: true,
                        detached: false, // 确保子进程不会分离
                    });

                    // 确保等待编辑器完全关闭
                    child.on('close', () => {
                        console.log('✅ 配置文件已关闭，请重新运行您的命令。');
                        resolve();
                    });

                    // 添加错误处理
                    child.on('error', (err) => {
                        console.error('❌ 打开编辑器出错:', err);
                        console.log('请手动编辑配置文件:', userConfigPath);
                        resolve();
                    });
                });
            }
        } catch (error) {
            console.error('配置过程出错:', error);
            throw error;
        } finally {
            // 确保进程状态正常
            process.stdin.pause();
        }
    }

    /**
     * 处理配置命令
     */
    async handleConfigCommand(options: any, commandArgs: string[]): Promise<void> {
        // 显示数据存储目录
        if (options.dataPath) {
            const dataPath = this.coreConfigService.getDataPath();
            console.log('数据存储目录:');
            console.log(`  ${dataPath}`);

            // 检查目录是否存在
            try {
                const stats = fs.statSync(dataPath);
                if (stats.isDirectory()) {
                    console.log('  ✅ 目录已存在');
                } else {
                    console.log('  ❌ 路径存在但不是目录');
                }
            } catch (err) {
                console.log('  ❓ 目录尚未创建，将在首次使用时自动创建');
            }
            return;
        }

        // 显示配置文件路径
        if (options.path) {
            const configFiles = await this.coreConfigService.findConfigFiles();
            console.log('配置文件路径:');
            if (configFiles.length === 0) {
                console.log('  未找到配置文件');
            } else {
                configFiles.forEach((file) => {
                    console.log(`  ${file}`);
                });
            }
            return;
        }

        // 初始化用户配置文件
        if (options.init) {
            const result = await this.coreConfigService.createDefaultUserConfig();
            console.log(`已创建配置文件: ${result.path}`);
            return;
        }

        // 编辑配置文件
        if (options.edit) {
            const configFiles = await this.coreConfigService.findConfigFiles();
            let configPath: string;

            if (configFiles.length === 0) {
                const result = await this.coreConfigService.createDefaultUserConfig();
                configPath = result.path;
                console.log(`已创建配置文件: ${configPath}`);
            } else if (configFiles.length === 1) {
                configPath = configFiles[0];
            } else {
                // 如果有多个配置文件，让用户选择要编辑哪一个
                const answers = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'configPath',
                        message: '选择要编辑的配置文件:',
                        choices: configFiles,
                    },
                ]);
                configPath = answers.configPath;
            }

            // 使用系统默认编辑器打开配置文件
            const editor =
                this.coreConfigService.getEnv('EDITOR') ||
                this.coreConfigService.getEnv('VISUAL') ||
                (process.platform === 'win32' ? 'notepad.exe' : 'vi');

            const child = spawn(editor, [configPath], {
                stdio: 'inherit',
                shell: true,
            });

            return new Promise((resolve) => {
                child.on('exit', () => {
                    console.log(`配置文件已关闭: ${configPath}`);
                    resolve(undefined);
                });
            });
        }

        // 获取指定配置项
        if (options.get) {
            const key = options.get.toUpperCase();
            const value = process.env[key];
            if (value !== undefined) {
                console.log(`${key}=${value}`);
            } else {
                console.log(`未找到配置项: ${key}`);
            }
            return;
        }

        // 设置配置项
        if (options.set) {
            const key = options.set.toUpperCase();
            const value = commandArgs[0];
            if (!value) {
                console.log('错误: 缺少值参数。用法: agentkai config --set KEY VALUE');
                return;
            }
            const result = await this.coreConfigService.saveConfig({
                ...this.coreConfigService.getFullConfig({ allowEmpty: true }),
                [key]: value,
            });
            if (result) {
                console.log(`已设置 ${key}=${value}`);
            } else {
                console.log('设置配置项失败');
            }
            return;
        }

        // 显示所有配置项（--list 选项或无参数时）
        if (options.list || (!options.path && !options.init && !options.edit && !options.get && !options.set && !options.dataPath)) {
            // 获取完整配置
            const fullConfig = this.coreConfigService.getFullConfig({ allowEmpty: true });
            
            // 获取所有环境变量
            const allEnvVars = process.env;

            console.log('\n=== 系统配置信息 ===');
            
            // 显示当前使用的配置文件
            const configFiles = await this.coreConfigService.findConfigFiles();
            console.log('\n📄 配置文件:');
            if (configFiles.length === 0) {
                console.log('  未找到配置文件');
            } else {
                configFiles.forEach((file) => {
                    console.log(`  ${file}`);
                });
            }
            
            // 显示数据存储路径
            const dataPath = this.coreConfigService.getDataPath();
            console.log('\n💾 数据存储目录:');
            console.log(`  ${dataPath}`);
            
            // 定义要显示的配置类别
            const categories = [
                { prefix: 'AI_', title: 'AI模型配置', icon: '🤖' },
                { prefix: 'MEMORY_', title: '记忆系统配置', icon: '🧠' },
                { prefix: 'DECISION_', title: '决策系统配置', icon: '🔍' },
                { prefix: 'APP_', title: '应用程序配置', icon: '⚙️' },
                { prefix: 'LOG_', title: '日志配置', icon: '📝' }
            ];

            // 显示完整的配置信息
            // 先显示分类的环境变量
            let hasDisplayedVars = false;
            categories.forEach((category) => {
                const categoryVars = Object.entries(allEnvVars)
                    .filter(([key]) => key.startsWith(category.prefix))
                    .sort(([a], [b]) => a.localeCompare(b));

                if (categoryVars.length > 0) {
                    hasDisplayedVars = true;
                    console.log(`\n${category.icon} ${category.title}:`);
                    categoryVars.forEach(([key, value]) => {
                        // 如果是API密钥，则隐藏部分内容
                        if (key.includes('API_KEY') && value) {
                            const hiddenValue =
                                value.substring(0, 4) +
                                '*'.repeat(Math.max(value.length - 8, 0)) +
                                (value.length > 4 ? value.substring(value.length - 4) : '');
                            console.log(`  ${key}=${hiddenValue}`);
                        } else {
                            console.log(`  ${key}=${value || ''}`);
                        }
                    });
                }
            });
            
            // 显示配置对象中的其他重要配置
            console.log('\n📊 配置对象信息:');
            
            // 显示模型配置
            if (fullConfig.modelConfig) {
                console.log('\n  模型配置:');
                Object.entries(fullConfig.modelConfig).forEach(([key, value]) => {
                    // 隐藏API密钥
                    if (key.toLowerCase().includes('apikey') && value) {
                        const hiddenValue = typeof value === 'string' ? 
                            value.substring(0, 4) +
                            '*'.repeat(Math.max(value.length - 8, 0)) +
                            (value.length > 4 ? value.substring(value.length - 4) : '') : '[复杂对象]';
                        console.log(`    ${key}: ${hiddenValue}`);
                    } else if (typeof value === 'object' && value !== null) {
                        console.log(`    ${key}: [对象]`);
                    } else {
                        console.log(`    ${key}: ${value}`);
                    }
                });
            }
            
            // 显示记忆配置
            if (fullConfig.memoryConfig) {
                console.log('\n  记忆配置:');
                Object.entries(fullConfig.memoryConfig).forEach(([key, value]) => {
                    if (typeof value === 'object' && value !== null) {
                        console.log(`    ${key}: [对象]`);
                    } else {
                        console.log(`    ${key}: ${value}`);
                    }
                });
            }
            
            // 显示其他重要配置项
            const otherImportantKeys = ['dataPath', 'logLevel', 'debug'];
            const otherConfig = otherImportantKeys
                .filter(key => {
                    if (key === 'dataPath' && fullConfig.appConfig) {
                        return fullConfig.appConfig.dataPath !== undefined;
                    }
                    return false;
                })
                .map(key => {
                    if (key === 'dataPath' && fullConfig.appConfig) {
                        return { key, value: fullConfig.appConfig.dataPath };
                    }
                    return { key, value: 'undefined' };
                });
                
            if (otherConfig.length > 0) {
                console.log('\n  其他配置:');
                otherConfig.forEach(({ key, value }) => {
                    console.log(`    ${key}: ${value}`);
                });
            }

            if (!hasDisplayedVars && Object.keys(fullConfig).length === 0) {
                console.log('\n⚠️ 未找到任何配置信息');
            }

            console.log('\n🔍 帮助提示:');
            console.log('  使用 "agentkai config --init" 创建默认配置文件');
            console.log('  使用 "agentkai config --edit" 编辑配置文件');
            console.log('  使用 "agentkai config --set KEY VALUE" 设置特定配置项');
            console.log('  使用 "agentkai config --get KEY" 获取特定配置项');
            return;
        }
    }

    // 封装CoreConfigService的方法，方便访问
    getCoreConfigService(): CoreConfigService {
        return this.coreConfigService;
    }
}
