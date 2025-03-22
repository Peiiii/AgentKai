import { AISystem } from '../core/AISystem';
import { Memory } from '../types';
import * as readline from 'readline';
import { Logger, Colors } from '../utils/logger';

export class ChatCommand {
    private logger: Logger;
    private rl: readline.Interface;
    
    constructor(private system: AISystem) {
        this.logger = new Logger('ChatCommand');
        
        // 创建readline接口
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    }

    async execute(): Promise<void> {
        try {
            this.printWelcomeMessage();
            await this.startChat();
        } catch (error) {
            this.logger.error('聊天过程中发生错误:', error);
            throw error;
        } finally {
            this.rl.close();
        }
    }

    private printWelcomeMessage(): void {
        this.logger.group('欢迎使用凯聊天助手');
        this.logger.info('特殊命令:');
        this.logger.info(`${Colors.bright}!save${Colors.reset} <内容>: 手动保存记忆`);
        this.logger.info(`${Colors.bright}!search${Colors.reset} <关键词>: 搜索记忆`);
        this.logger.info(`${Colors.bright}!clear${Colors.reset}: 清除当前对话历史`);
        this.logger.info(`${Colors.bright}exit${Colors.reset}: 退出聊天模式`);
        this.logger.divider(40);
    }

    private async startChat(): Promise<void> {
        // 循环处理用户输入
        let chatting = true;
        while (chatting) {
            try {
                const input = await this.getUserInput();
                
                // 检查是否退出
                if (input.toLowerCase() === 'exit') {
                    this.logger.success('感谢使用，再见！');
                    chatting = false;
                    break;
                }
                
                // 处理特殊命令
                if (input.startsWith('!')) {
                    await this.handleSpecialCommand(input);
                    continue;
                }
                
                // 处理常规对话
                this.logger.divider();
                const response = await this.system.processInput(input);
                
                if (response.relevantMemories && response.relevantMemories.length > 0) {
                    this.logger.debug('相关记忆:', response.relevantMemories);
                }
                
                // 显示输出，使用彩色
                console.log(`\n${Colors.info}AI:${Colors.reset} ${response.output}\n`);
                
                // 显示token使用情况 - 让token信息始终显示，而不只是在debug模式下
                const tokenInfo = (response as any).tokens;
                if (tokenInfo) {
                    console.log(`${Colors.dim}Token 使用情况: 提示词 ${tokenInfo.prompt} | 回复 ${tokenInfo.completion} | 总计 ${tokenInfo.total}${Colors.reset}`);
                }
                
                this.logger.divider();
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
        try {
            await this.system.addMemory(content, {
                type: 'manual',
                timestamp: Date.now(),
            });
            this.logger.success('记忆已保存');
        } catch (error) {
            this.logger.error('保存记忆失败:', error);
        }
    }

    private async searchMemories(query: string): Promise<void> {
        try {
            this.logger.info(`正在搜索: "${query}"`);
            const memories = await this.system.searchMemories(query);
            
            if (memories.length === 0) {
                this.logger.info('没有找到相关记忆');
                return;
            }
            
            this.logger.success(`找到 ${memories.length} 条相关记忆:`);
            
            memories.forEach((memory: Memory, index: number) => {
                const date = new Date(memory.metadata.timestamp || 0).toLocaleString();
                console.log(`\n${Colors.bright}记忆 ${index + 1}:${Colors.reset}`);
                console.log(`${Colors.dim}日期:${Colors.reset} ${date}`);
                console.log(`${Colors.bright}内容:${Colors.reset} ${memory.content}`);
                if ((memory as any).similarity !== undefined) {
                    console.log(`${Colors.dim}相似度:${Colors.reset} ${(memory as any).similarity.toFixed(2)}`);
                }
            });
        } catch (error) {
            this.logger.error('搜索记忆失败:', error);
        }
    }

    private async clearConversation(): Promise<void> {
        try {
            await this.system.clearCurrentConversation();
            this.logger.success('对话历史已清除');
        } catch (error) {
            this.logger.error('清除对话历史失败:', error);
        }
    }
}