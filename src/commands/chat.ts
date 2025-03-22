import { AISystem } from '../core/AISystem';
import * as readline from 'readline';
import { Logger } from '../utils/logger';

export class ChatCommand {
    private logger: Logger;

    constructor(private system: AISystem) {
        this.logger = new Logger('ChatCommand');
    }

    async execute(): Promise<void> {
        this.logger.info('开始聊天模式，输入 "exit" 退出');
        console.log('特殊命令:');
        console.log('- !save <内容>: 手动保存记忆');
        console.log('- !search <关键词>: 搜索记忆');
        console.log('- !clear: 清除当前对话历史');
        console.log('- exit: 退出聊天模式');
        console.log('-------------------------------------');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        let chatting = true;
        while (chatting) {
            const input = await new Promise<string>((resolve) => {
                rl.question('> ', (answer) => {
                    resolve(answer);
                });
            });
            console.log('-------------------------------------');
            // 处理特殊命令
            if (input.startsWith('!save ')) {
                const content = input.substring(6).trim();
                if (content) {
                    this.logger.info('正在保存记忆', { content: content.substring(0, 50) + (content.length > 50 ? '...' : '') });
                    await this.system.addMemory(content, {
                        type: 'note',
                        importance: 1.0, // 手动保存的记忆重要性设为最高
                        timestamp: Date.now(),
                    });
                    this.logger.info('记忆已保存');
                } else {
                    this.logger.warn('保存内容不能为空');
                }
                continue;
            }

            if (input.startsWith('!search ')) {
                const query = input.substring(8).trim();
                if (query) {
                    this.logger.info('正在搜索记忆', { query });
                    const memories = await this.system.searchMemories(query);
                    if (memories.length === 0) {
                        console.log('未找到相关记忆');
                    } else {
                        console.log('找到以下相关记忆:');
                        memories.forEach((memory, index) => {
                            console.log(`[${index + 1}] ${memory.content}`);
                        });
                    }
                } else {
                    this.logger.warn('搜索关键词不能为空');
                }
                continue;
            }

            if (input === '!clear') {
                this.logger.info('清除当前对话历史');
                await this.system.clearCurrentConversation();
                this.logger.info('对话历史已清除');
                continue;
            }

            if (input.toLowerCase() === 'exit') {
                this.logger.info('退出聊天模式');
                chatting = false;
                continue;
            }

            // 正常聊天处理
            try {
                const result = await this.system.processInput(input);                
                if (result.tokens) {
                    this.logger.debug('Token 使用情况', { 
                        prompt: result.tokens.prompt,
                        completion: result.tokens.completion,
                        total: result.tokens.prompt + result.tokens.completion
                    });
                    console.log('\nToken 使用情况:');
                    console.log(`- 提示词: ${result.tokens.prompt}`);
                    console.log(`- 回复: ${result.tokens.completion}`);
                    console.log(`- 总计: ${result.tokens.prompt + result.tokens.completion}`);
                }
                console.log('----------------------------------------');
                console.log('\nAI:', result.output || '无响应');

            } catch (error) {
                this.logger.error('处理输入时出错', error);
                console.log('----------------------------------------');
            }
        }

        rl.close();
    }
}