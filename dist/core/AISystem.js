"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AISystem = void 0;
const DecisionEngine_1 = require("../decision/DecisionEngine");
const GoalManager_1 = require("../goals/GoalManager");
const MemorySystem_1 = require("../memory/MemorySystem");
const FileSystemStorage_1 = require("../storage/FileSystemStorage");
const ToolManager_1 = require("../tools/ToolManager");
const basic_1 = require("../tools/basic");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const performance_1 = require("../utils/performance");
class AISystem {
    constructor(config, model) {
        this.lastResponse = null;
        this.conversationHistory = [];
        this.requestTimeoutMs = 30000; // 默认请求超时时间为30秒
        this.storage = new FileSystemStorage_1.FileSystemStorage();
        this.decision = new DecisionEngine_1.DecisionEngine(config.decisionConfig);
        this.memory = new MemorySystem_1.MemorySystem(config.memoryConfig, model);
        this.goals = new GoalManager_1.GoalManager(this.storage);
        this.model = model;
        // 使用DefaultToolCallFormat初始化ToolManager
        this.tools = new ToolManager_1.ToolManager();
        this.logger = new logger_1.Logger('AISystem');
        this.performance = new performance_1.PerformanceMonitor('AISystem');
    }
    async initialize() {
        // 初始化记忆系统
        await this.memory.initialize();
        // 初始化目标系统
        await this.goals.initialize();
        // 注册工具
        this.logger.info('注册工具...');
        // 注册记忆相关工具
        const memoryTools = (0, basic_1.createMemoryTools)(this.memory);
        this.tools.registerTools(memoryTools);
        // 注册目标相关工具
        const goalTools = (0, basic_1.createGoalTools)(this.goals);
        this.tools.registerTools(goalTools);
        this.logger.info(`已注册 ${memoryTools.length + goalTools.length} 个工具`);
    }
    async processInput(input) {
        // 检查是否是退出命令
        if (input.toLowerCase() === 'exit') {
            // 保存对话历史到记忆系统
            await this.memory.addMemory('对话结束', {
                type: 'conversation',
                role: 'system',
                timestamp: Date.now(),
                history: this.conversationHistory,
            });
            // 清空对话历史
            this.conversationHistory = [];
            return {
                output: '再见！',
                relevantMemories: [],
                activeGoals: [],
            };
        }
        this.logger.info('处理用户输入开始');
        this.performance.start('processInput');
        try {
            // 1. 获取相关记忆
            this.performance.start('searchMemories');
            const relevantMemories = await this.withTimeout(this.memory.searchMemories(input), this.requestTimeoutMs, '记忆搜索超时');
            this.performance.end('searchMemories');
            // 2. 获取活跃目标
            this.performance.start('getActiveGoals');
            const activeGoals = await this.withTimeout(this.goals.getActiveGoals(), this.requestTimeoutMs, '获取目标超时');
            this.logger.info(`当前活跃目标数量: ${activeGoals.length}`);
            activeGoals.forEach((goal) => {
                this.logger.debug(`目标信息: ${goal.description}`, { progress: goal.progress, priority: goal.priority });
            });
            this.performance.end('getActiveGoals');
            // 3. 处理用户输入并生成回复
            this.performance.start('generateResponse');
            // 先添加用户输入到对话历史
            this.conversationHistory.push({ role: 'user', content: input });
            // 保持最近的10轮对话
            if (this.conversationHistory.length > 10) {
                this.conversationHistory = this.conversationHistory.slice(-10);
            }
            // 构建上下文
            const messages = this.buildContextMessages(relevantMemories, activeGoals);
            // 生成回复
            let response, tokens;
            try {
                const result = await this.withTimeout(this.model.generateResponse(messages), this.requestTimeoutMs * 2, // 模型生成给2倍时间
                '生成响应超时');
                response = result.response;
                tokens = result.tokens;
            }
            catch (error) {
                this.logger.error('生成响应失败', error);
                throw (0, errors_1.wrapError)(error, '生成响应失败');
            }
            // 处理可能的工具调用
            const processedResponse = await this.processToolsInResponse(response);
            const finalOutput = processedResponse.modifiedText;
            this.logger.info('Token 使用情况', {
                prompt: tokens.prompt,
                completion: tokens.completion,
                total: tokens.prompt + tokens.completion
            });
            this.performance.end('generateResponse');
            // 添加AI回复到对话历史（使用处理后的输出）
            this.conversationHistory.push({ role: 'assistant', content: finalOutput });
            // 不再自动添加记忆，由AI通过工具调用或用户手动添加
            this.logger.info('对话已存储到短期记忆，未自动添加到长期记忆');
            const totalTime = this.performance.end('processInput');
            this.logger.info(`处理用户输入完成，总耗时 ${totalTime}ms`);
            // 返回响应
            return {
                output: finalOutput.trim(),
                relevantMemories,
                activeGoals,
                tokens,
            };
        }
        catch (error) {
            this.performance.end('processInput'); // 确保即使出错也结束计时
            this.logger.error('处理用户输入失败', error);
            return {
                output: `处理您的请求时出错: ${error instanceof Error ? error.message : String(error)}`,
                relevantMemories: [],
                activeGoals: [],
            };
        }
    }
    /**
     * 添加超时机制的Promise包装
     */
    async withTimeout(promise, timeoutMs, message) {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new errors_1.ModelError(`${message} (${timeoutMs}ms)`));
            }, timeoutMs);
        });
        try {
            return await Promise.race([promise, timeoutPromise]);
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * 构建发送给模型的上下文信息
     */
    buildContextMessages(relevantMemories, activeGoals) {
        // 按照新的设计重构上下文构建
        return [
            // 1. 系统设定 + AI自身角色定义
            this.buildSystemPrompt(),
            // 2. 当前所有活跃目标
            '当前活跃目标：',
            ...(activeGoals.length > 0
                ? activeGoals.map((g) => `- [${g.priority}] ${g.description} (进度: ${g.progress * 100}%)`)
                : ['当前没有活跃目标。']),
            // 3. 相关长期记忆
            '相关长期记忆：',
            ...(relevantMemories.length > 0
                ? relevantMemories.slice(0, 5).map((m) => `- ${m.content}`)
                : ['无相关长期记忆']),
            // 4. 短期记忆（对话历史）
            '当前对话历史：',
            ...this.conversationHistory.map((msg) => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`),
            // 5. 工具使用指导
            this.tools.getToolGuide(),
            // 6. 工具定义
            '可用工具定义：',
            ...this.tools.getFormattedToolDefinitions(),
            // 7. 最后的指导
            '请根据以上信息回答用户的问题。如需保存重要信息到长期记忆，请使用add_memory工具。',
        ];
    }
    /**
     * 处理响应中的工具调用
     */
    async processToolsInResponse(response) {
        // 使用ToolManager处理工具调用
        return this.tools.processToolCall(response);
    }
    async addMemory(content, metadata) {
        await this.memory.addMemory(content, metadata);
    }
    async searchMemories(query) {
        console.log('\n[CLI] 开始搜索记忆:', query);
        const memories = await this.memory.searchMemories(query);
        return memories;
    }
    async getAllMemories() {
        return this.memory.getAllMemories();
    }
    async deleteMemory(id) {
        await this.memory.deleteMemory(id);
    }
    async clearMemories() {
        await this.memory.clearMemories();
    }
    async addGoal(goal) {
        return this.goals.addGoal(goal);
    }
    async getGoal(id) {
        return this.goals.getGoal(id);
    }
    async getActiveGoals() {
        return this.goals.getActiveGoals();
    }
    async updateGoalStatus(goalId, status) {
        await this.goals.updateGoalStatus(goalId, status);
    }
    async updateGoalProgress(goalId, progress) {
        await this.goals.updateGoalProgress(goalId, progress);
    }
    async clearGoals() {
        await this.goals.clearGoals();
    }
    async getAllGoals() {
        return this.goals.getAllGoals();
    }
    async deleteGoal(id) {
        await this.goals.deleteGoal(id);
    }
    // 清除当前对话历史
    async clearCurrentConversation() {
        this.logger.info('清除当前对话历史');
        this.conversationHistory = [];
        this.logger.info('对话历史已清除');
    }
    buildSystemPrompt() {
        return `你是一个AI助手，负责帮助用户完成任务。

请遵循以下规则：
1. 保持回应简洁明了，直接给出答案
2. 不要包含分析过程，除非用户特别要求
3. 如果遇到不确定的情况，简单说明即可
4. 注意上下文连续性，参考对话历史回答问题
5. 根据需要使用工具，特别是保存重要信息到长期记忆
6. 如果用户输入不明确，主动询问细节

记忆管理：
- 短期记忆：当前对话历史，自动管理
- 长期记忆：重要信息，需要通过add_memory工具主动添加

工具使用指南：
- 只在需要时才使用工具
- 添加记忆时，将重要信息保存到长期记忆
- 使用工具时，严格遵循指定的格式
- 对于是否调用工具，使用以下判断标准:
  * 添加记忆: 当信息对未来对话有价值
  * 搜索记忆: 当需要查找历史相关信息
  * 添加目标: 当用户明确表达长期目标
  * 更新目标: 当目标有明确进展

当前系统状态：
- 对话历史已激活（保留最近10轮对话）
- 长期记忆系统已激活（需主动添加和检索）
- 目标系统已激活（所有活跃目标可见）`;
    }
}
exports.AISystem = AISystem;
