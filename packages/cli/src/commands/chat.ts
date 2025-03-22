import { AISystem } from '@agentkai/core';
import { Memory } from '@agentkai/core';
import * as readline from 'readline';
import { Logger, Colors } from '@agentkai/core';
import * as path from 'path';
import * as fs from 'fs';

export class ChatCommand {
    private logger: Logger;
    private rl: readline.Interface;
    private version: string;
    
    constructor(private system: AISystem) {
        this.logger = new Logger('ChatCommand');
        
        // 创建readline接口
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        
        // 初始化版本号
        this.version = this.getVersion();
    }

    /**
     * 获取当前应用版本号
     */
    private getVersion(): string {
        try {
            // 可能的包路径
            const possiblePaths = [
                path.resolve(__dirname, '../../../package.json'), // 开发环境
                path.resolve(__dirname, '../../package.json'),    // npm包安装环境
                path.resolve(process.cwd(), 'package.json')       // 当前工作目录
            ];
            
            // 尝试读取package.json
            for (const pkgPath of possiblePaths) {
                if (fs.existsSync(pkgPath)) {
                    const packageData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                    if (packageData.name === 'agentkai') {
                        return packageData.version;
                    }
                }
            }
        } catch (error) {
            this.logger.debug('无法读取版本号:', error);
        }
        
        return '未知'; // 默认返回未知版本
    }

    async execute(): Promise<void> {
        try {
            // 临时关闭或调整logger选项，确保UI显示正常
            const originalLoggerOptions = Logger.getGlobalOptions();
            Logger.setGlobalOptions({
                ...originalLoggerOptions,
                showTimestamp: false, // 隐藏时间戳使界面更整洁
                showModule: false,    // 隐藏模块名称
            });
            
            this.printWelcomeMessage();
            await this.startChat();
            
            // 恢复原始logger选项
            Logger.setGlobalOptions(originalLoggerOptions);
        } catch (error) {
            this.logger.error('聊天过程中发生错误:', error);
            throw error;
        } finally {
            this.rl.close();
        }
    }

    private printWelcomeMessage(): void {
        // 清屏效果（使用ANSI转义序列）
        process.stdout.write('\x1Bc');
        
        console.log(`\n${Colors.bright}✨ 欢迎使用 ${Colors.success}AgentKai${Colors.reset} ${Colors.bright}智能助手 ✨${Colors.reset} ${Colors.dim}v${this.version}${Colors.reset}\n`);
        console.log(`${Colors.dim}── 特殊命令 ──${Colors.reset}`);
        console.log(`  ${Colors.bright}!save${Colors.reset} <内容>   保存重要信息到长期记忆`);
        console.log(`  ${Colors.bright}!search${Colors.reset} <关键词> 搜索长期记忆`);
        console.log(`  ${Colors.bright}!clear${Colors.reset}         清除当前对话历史`);
        console.log(`  ${Colors.bright}exit${Colors.reset}           退出聊天模式\n`);
        console.log(`${Colors.dim}输入您的问题或命令开始对话...${Colors.reset}\n`);
    }

    private async startChat(): Promise<void> {
        // 循环处理用户输入
        let chatting = true;
        while (chatting) {
            try {
                const input = await this.getUserInput();
                
                // 检查是否退出
                if (input.toLowerCase() === 'exit') {
                    // 使用简化logger配置显示退出消息
                    const originalLoggerOptions = Logger.getGlobalOptions();
                    Logger.setGlobalOptions({
                        ...originalLoggerOptions,
                        showTimestamp: false,
                        showLogLevel: false,
                        showModule: false,
                    });
                    
                    this.logger.success('感谢使用，再见！');
                    
                    // 恢复logger配置
                    Logger.setGlobalOptions(originalLoggerOptions);
                    
                    chatting = false;
                    break;
                }
                
                // 处理特殊命令
                if (input.startsWith('!')) {
                    await this.handleSpecialCommand(input);
                    continue;
                }
                
                // 处理常规对话（不显示分隔符，保持界面简洁）
                const response = await this.system.processInput(input);
                
                // 显示输出，使用彩色但简洁的格式
                console.log(`\n${Colors.info}AI:${Colors.reset} ${response.output}`);
                
                // 显示token使用情况 - 让token信息始终显示，但使用暗色调
                const tokenInfo = (response as any).tokens;
                if (tokenInfo) {
                    console.log(`${Colors.dim}Token 使用情况: 提示词 ${tokenInfo.prompt} | 回复 ${tokenInfo.completion} | 总计 ${tokenInfo.total}${Colors.reset}\n`);
                }
            } catch (error) {
                this.logger.error('处理消息时出错:', error);
                console.log(`\n${Colors.error}出现错误:${Colors.reset} 无法处理您的消息。请重试或检查日志。\n`);
            }
        }
    }

    private getUserInput(): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(`${Colors.bright}>${Colors.reset} `, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    private async handleSpecialCommand(input: string): Promise<void> {
        const parts = input.split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');

        switch (command) {
            case '!save':
                if (!args) {
                    this.logger.warn('请提供要保存的内容');
                    return;
                }
                await this.saveMemory(args);
                break;
            case '!search':
                if (!args) {
                    this.logger.warn('请提供搜索关键词');
                    return;
                }
                await this.searchMemories(args);
                break;
            case '!clear':
                await this.clearConversation();
                break;
            default:
                this.logger.warn(`未知命令: ${command}`);
                break;
        }
    }

    private async saveMemory(content: string): Promise<void> {
        // 使用临时简化logger配置
        const originalLoggerOptions = Logger.getGlobalOptions();
        Logger.setGlobalOptions({
            ...originalLoggerOptions,
            showTimestamp: false,
            showLogLevel: false,
            showModule: false,
        });
        
        try {
            this.logger.info(`正在保存记忆...`);
            await this.system.addMemory(content, {
                type: 'manual',
                timestamp: Date.now(),
            });
            this.logger.success(`✓ 记忆已成功保存`);
        } catch (error) {
            this.logger.error(`✗ 记忆保存失败`, error);
        } finally {
            // 恢复原始logger配置
            Logger.setGlobalOptions(originalLoggerOptions);
        }
    }

    private async searchMemories(query: string): Promise<void> {
        try {
            // 使用临时简化logger配置
            const originalLoggerOptions = Logger.getGlobalOptions();
            Logger.setGlobalOptions({
                ...originalLoggerOptions,
                showTimestamp: false,
                showLogLevel: false,
                showModule: false,
            });
            
            this.logger.info(`搜索记忆: "${query}"...`);
            const memories = await this.system.searchMemories(query);
            
            if (memories.length === 0) {
                this.logger.info(`没有找到相关记忆`);
                // 恢复原始logger配置
                Logger.setGlobalOptions(originalLoggerOptions);
                return;
            }
            
            this.logger.success(`找到 ${memories.length} 条相关记忆:`);
            
            memories.forEach((memory: Memory, index: number) => {
                const date = new Date(memory.createdAt).toLocaleString();
                console.log(`\n${Colors.bright}${index + 1}.${Colors.reset} ${memory.content}`);
                
                // 显示相似度信息
                if (memory.metadata && memory.metadata.similarity !== undefined) {
                    console.log(`   ${Colors.dim}相似度: ${memory.metadata.similarity.toFixed(4)} | 日期: ${date}${Colors.reset}`);
                } else {
                    console.log(`   ${Colors.dim}日期: ${date}${Colors.reset}`);
                }
            });
            console.log(); // 额外的空行增加可读性
            
            // 恢复原始logger配置
            Logger.setGlobalOptions(originalLoggerOptions);
        } catch (error) {
            this.logger.error('搜索记忆失败:', error);
            // 确保即使出错也恢复logger配置
            Logger.setGlobalOptions(Logger.getGlobalOptions());
        }
    }

    private async clearConversation(): Promise<void> {
        // 使用临时简化logger配置
        const originalLoggerOptions = Logger.getGlobalOptions();
        Logger.setGlobalOptions({
            ...originalLoggerOptions,
            showTimestamp: false,
            showLogLevel: false,
            showModule: false,
        });
        
        try {
            this.logger.info(`正在清除对话历史...`);
            await this.system.clearCurrentConversation();
            this.logger.success(`✓ 对话历史已清除`);
        } catch (error) {
            this.logger.error(`✗ 清除对话历史失败`, error);
        } finally {
            // 恢复原始logger配置
            Logger.setGlobalOptions(originalLoggerOptions);
        }
    }
}