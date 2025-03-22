import { Config, Goal, Memory } from '../../types';
import { Logger } from '../../utils/logger';
import { ConversationMessage } from '../conversation/ConversationManager';
import { ToolManager } from '../../tools/ToolManager';

/**
 * 提示构建器
 * 负责构建AI系统提示和上下文信息
 */
export class PromptBuilder {
  private config: Config;
  private logger: Logger;
  private toolManager: ToolManager;

  /**
   * 构造函数
   * @param config 系统配置
   */
  constructor(config: Config) {
    this.config = config;
    this.logger = new Logger('PromptBuilder');
    this.toolManager = new ToolManager();
  }

  /**
   * 构建系统提示
   * @returns 系统提示文本
   */
  buildSystemPrompt(): string {
    const aiName = this.config?.appConfig?.name || '凯';

    return `你是一个名为"${aiName}"的AI助手，负责帮助用户完成任务。

请遵循以下规则：
1. 保持回应简洁明了，直接给出答案
2. 不要包含分析过程，除非用户特别要求
3. 如果遇到不确定的情况，简单说明即可
4. 注意上下文连续性，参考对话历史回答问题
5. 根据需要使用工具，特别是保存重要信息到长期记忆
6. 如果用户输入不明确，主动询问细节
7. 当用户询问你的名字时，你应该回答你的名字是"${aiName}"

记忆管理：
- 短期记忆：当前对话历史，自动管理
- 长期记忆：重要信息，需要通过add_memory工具主动添加

工具使用指南：
- 只在需要时才使用工具
- 添加记忆时，将重要信息保存到长期记忆
- 使用工具时，有两种方式可以调用:

方式一（推荐）：使用[[工具名(参数)]]的格式
例如：
  [[search_memories(query: "记忆内容")]]
  [[add_memory(content: "记忆内容", importance: 8)]]
  [[web_search(query: "搜索内容")]]
简单参数也可以直接传递：
  [[search_memories("记忆内容")]]

方式二：使用传统工具调用格式
- 工具调用后，你将看到工具执行结果，可以:
  1. 根据结果决定是否调用其他工具
  2. 根据结果修改参数重新调用同一工具
  3. 基于结果直接给用户回复

工具选择标准:
- 添加记忆: 当信息对未来对话有价值
- 搜索记忆: 当需要查找历史相关信息
- 添加目标: 当用户明确表达长期目标
- 更新目标: 当目标有明确进展
- 网络搜索: 当需要查找实时信息

当前系统状态：
- 对话历史已激活（保留最近10轮对话）
- 长期记忆系统已激活（需主动添加和检索）
- 目标系统已激活（所有活跃目标可见）`;
  }

  /**
   * 构建上下文消息
   * @param conversationHistory 会话历史
   * @param relevantMemories 相关记忆
   * @param activeGoals 活跃目标
   * @param tools 可用工具
   * @returns 上下文消息数组
   */
  buildContextMessages(
    conversationHistory: ConversationMessage[],
    relevantMemories: Memory[],
    activeGoals: Goal[],
    tools: any[] = []
  ): string[] {
    // 获取工具服务中的所有工具定义
    const serviceTools = tools || [];

    // 构建上下文
    return [
      // 1. 系统设定 + AI自身角色定义
      this.buildSystemPrompt(),

      // 2. 当前所有活跃目标
      '当前活跃目标：',
      ...(activeGoals.length > 0
        ? activeGoals.map(
            (g) => `- [${g.priority}] ${g.description} (进度: ${g.progress * 100}%)`
          )
        : ['当前没有活跃目标。']),

      // 3. 相关长期记忆
      '相关长期记忆：',
      ...(relevantMemories.length > 0
        ? relevantMemories.slice(0, 5).map((m) => `- ${m.content}`)
        : ['无相关长期记忆']),

      // 4. 短期记忆（对话历史）
      '当前对话历史：',
      ...conversationHistory.map(
        (msg) => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`
      ),

      // 5. 工具使用指导
      this.toolManager.getToolGuide(),

      // 6. 服务工具定义
      '可用服务工具：',
      ...(serviceTools.length > 0
        ? serviceTools.map((tool) => {
            const paramDesc = tool.parameters
              ? `\n参数: ${JSON.stringify(tool.parameters, null, 2)}`
              : '';
            return `- ${tool.name}: ${tool.description}${paramDesc}`;
          })
        : ['无可用服务工具']),

      // 7. 传统工具定义
      '可用传统工具定义：',
      ...this.toolManager.getFormattedToolDefinitions(),

      // 8. 最后的指导
      '请根据以上信息回答用户的问题。如需保存重要信息到长期记忆，请使用add_memory工具。',
    ];
  }

  /**
   * 构建简单上下文
   * @param conversationHistory 会话历史
   * @param relevantMemories 相关记忆
   * @param activeGoals 活跃目标
   * @returns 上下文消息数组
   */
  buildSimpleContext(
    conversationHistory: ConversationMessage[],
    relevantMemories: Memory[],
    activeGoals: Goal[]
  ): string[] {
    return [
      // 基本系统指令
      '你是一个有帮助的AI助手。',

      // 活跃目标（简化版）
      activeGoals.length > 0 ? '当前目标：' : '',
      ...activeGoals.slice(0, 2).map(g => `- ${g.description}`),

      // 相关记忆（简化版）
      relevantMemories.length > 0 ? '相关记忆：' : '',
      ...relevantMemories.slice(0, 3).map(m => `- ${m.content}`),

      // 对话历史（仅最近几条）
      '近期对话：',
      ...conversationHistory.slice(-3).map(
        msg => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`
      ),
    ].filter(item => item !== ''); // 移除空字符串
  }
} 