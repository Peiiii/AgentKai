import * as readline from 'readline';
import { UserInterface } from './interfaces';
import { Colors } from '@agentkai/core';

/**
 * 控制台界面实现，使用命令行与用户交互
 */
export class ConsoleUI implements UserInterface {
  private rl: readline.Interface;
  
  constructor(private options: { colorEnabled?: boolean } = {}) {
    // 默认启用颜色
    this.options.colorEnabled = options.colorEnabled !== false;
    
    // 创建readline接口
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  
  /**
   * 显示欢迎信息
   */
  showWelcome(version: string): void {
    // 清屏效果（使用ANSI转义序列）
    process.stdout.write('\x1Bc');
    
    if (this.options.colorEnabled) {
      console.log(`\n${Colors.bright}✨ 欢迎使用 ${Colors.success}AgentKai${Colors.reset} ${Colors.bright}智能助手 ✨${Colors.reset} ${Colors.dim}v${version}${Colors.reset}\n`);
      console.log(`${Colors.dim}── 特殊命令 ──${Colors.reset}`);
      console.log(`  ${Colors.bright}!save${Colors.reset} <内容>   保存重要信息到长期记忆`);
      console.log(`  ${Colors.bright}!search${Colors.reset} <关键词> 搜索长期记忆`);
      console.log(`  ${Colors.bright}!clear${Colors.reset}         清除当前对话历史`);
      console.log(`  ${Colors.bright}exit${Colors.reset}           退出聊天模式\n`);
      console.log(`${Colors.dim}输入您的问题或命令开始对话...${Colors.reset}\n`);
    } else {
      console.log(`\n✨ 欢迎使用 AgentKai 智能助手 ✨ v${version}\n`);
      console.log(`── 特殊命令 ──`);
      console.log(`  !save <内容>   保存重要信息到长期记忆`);
      console.log(`  !search <关键词> 搜索长期记忆`);
      console.log(`  !clear         清除当前对话历史`);
      console.log(`  exit           退出聊天模式\n`);
      console.log(`输入您的问题或命令开始对话...\n`);
    }
  }
  
  /**
   * 显示输入提示符
   */
  showPrompt(): void {
    process.stdout.write(this.options.colorEnabled ? `${Colors.bright}>${Colors.reset} ` : '> ');
  }
  
  /**
   * 获取用户输入
   */
  getInput(): Promise<string> {
    return new Promise((resolve) => {
      this.showPrompt();
      this.rl.once('line', (input) => {
        resolve(input.trim());
      });
    });
  }
  
  /**
   * 显示AI响应
   */
  showResponse(response: string, metadata?: Record<string, any>): void {
    if (this.options.colorEnabled) {
      console.log(`\n${Colors.info}AI:${Colors.reset} ${response}`);
      
      // 显示token使用情况
      if (metadata?.tokens) {
        const tokens = metadata.tokens;
        console.log(`${Colors.dim}Token 使用情况: 提示词 ${tokens.prompt} | 回复 ${tokens.completion} | 总计 ${tokens.total}${Colors.reset}\n`);
      }
    } else {
      console.log(`\nAI: ${response}`);
      
      // 显示token使用情况
      if (metadata?.tokens) {
        const tokens = metadata.tokens;
        console.log(`Token 使用情况: 提示词 ${tokens.prompt} | 回复 ${tokens.completion} | 总计 ${tokens.total}\n`);
      }
    }
  }
  
  /**
   * 显示错误信息
   */
  showError(error: string): void {
    if (this.options.colorEnabled) {
      console.log(`\n${Colors.error}错误:${Colors.reset} ${error}\n`);
    } else {
      console.log(`\n错误: ${error}\n`);
    }
  }
  
  /**
   * 显示信息消息
   */
  showInfo(message: string): void {
    if (this.options.colorEnabled) {
      console.log(`${Colors.info}${message}${Colors.reset}`);
    } else {
      console.log(message);
    }
  }
  
  /**
   * 显示成功消息
   */
  showSuccess(message: string): void {
    if (this.options.colorEnabled) {
      console.log(`${Colors.success}${message}${Colors.reset}`);
    } else {
      console.log(message);
    }
  }
  
  /**
   * 关闭界面
   */
  close(): void {
    this.rl.close();
  }
  
  /**
   * 显示内存搜索结果
   */
  showMemorySearchResults(memories: any[], query: string): void {
    if (memories.length === 0) {
      this.showInfo(`没有找到与"${query}"相关的记忆`);
      return;
    }
    
    this.showSuccess(`找到 ${memories.length} 条相关记忆:`);
    
    memories.forEach((memory: any, index: number) => {
      const date = new Date(memory.timestamp).toLocaleString();
      
      if (this.options.colorEnabled) {
        console.log(`\n${Colors.bright}${index + 1}.${Colors.reset} ${memory.content}`);
        
        // 显示相似度信息
        if (memory.metadata && memory.metadata.similarity !== undefined) {
          console.log(`   ${Colors.dim}相似度: ${memory.metadata.similarity.toFixed(4)} | 日期: ${date}${Colors.reset}`);
        } else {
          console.log(`   ${Colors.dim}日期: ${date}${Colors.reset}`);
        }
      } else {
        console.log(`\n${index + 1}. ${memory.content}`);
        
        // 显示相似度信息
        if (memory.metadata && memory.metadata.similarity !== undefined) {
          console.log(`   相似度: ${memory.metadata.similarity.toFixed(4)} | 日期: ${date}`);
        } else {
          console.log(`   日期: ${date}`);
        }
      }
    });
    
    console.log(); // 额外的空行增加可读性
  }
} 