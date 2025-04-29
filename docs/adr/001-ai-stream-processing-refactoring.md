# ADR 001: AI流式处理的重构设计

## 状态

提议

## 背景

当前系统中的`processInputStreamWithTools`函数承担了流式处理AI响应和执行工具调用的重要职责。随着系统的发展，我们需要进一步优化这个流程，尤其是支持工具调用后的循环响应过程，即工具执行后需要触发AI再次响应的能力。

当前实现存在以下问题：
1. 函数职责过于宽泛，既负责初始化处理器，又负责流式响应处理和工具调用执行
2. 流程相对线性，不支持工具调用后的循环反馈机制
3. 代码可复用性低，难以支持未来的功能扩展和变化

## 决策

我们决定重构AI流式处理流程，将单一大函数拆分为多个职责明确的小函数，并设计支持循环工具调用的架构。同时，我们将遵循渐进式重构原则，避免过度设计和过度抽象，确保实现成本可控且能快速见效。

## 方案比较

### 方案1：基于状态机的循环处理

**核心思想**：将整个流程视为一个状态机，根据不同状态执行不同的处理逻辑。

**主要组件**：
- `AIStreamProcessor`: 主控制器，管理整个流程
- `AIStateManager`: 状态管理器，维护当前处理状态
- `AIResponseHandler`: 响应处理器，处理AI的文本响应
- `ToolCallHandler`: 工具调用处理器，处理工具调用
- `FeedbackProcessor`: 反馈处理器，将工具调用结果反馈给AI

**优点**：
- 完全解耦各个处理阶段
- 状态机模式便于理解和调试
- 高度可扩展，易于添加新状态和行为

**缺点**：
- 引入额外的概念和复杂性
- 状态管理的开销
- 代码量会显著增加
- **实现成本高**，需要创建多个新类和完整的状态转换机制

### 方案2：基于事件的流程处理

**核心思想**：使用事件驱动架构，通过事件触发不同的处理阶段。

**主要组件**：
- `AIStreamClient`: 核心控制器，管理订阅和触发
- `ResponseProcessor`: 处理AI文本响应
- `ToolProcessor`: 处理工具调用
- `FeedbackEmitter`: 发送工具结果反馈

**优点**：
- 高度解耦，组件之间通过事件通信
- 灵活性高，易于扩展新的事件类型
- 代码结构清晰，便于测试

**缺点**：
- 事件流程可能难以追踪
- 调试复杂性增加
- 额外的事件管理开销
- **实现成本中等**，需要设计全新的事件系统或大幅扩展现有系统

### 方案3：基于责任链的流程处理

**核心思想**：将流程分解为一系列处理步骤，每一步负责特定任务并决定是否继续。

**主要组件**：
- `AIStreamOrchestrator`: 流程编排控制器
- `InitialResponseHandler`: 初始响应处理
- `ToolCallExecutor`: 工具调用执行器
- `FeedbackHandler`: 结果反馈处理器
- `StreamResultCollector`: 结果收集器

**优点**：
- 流程清晰，每个处理器职责单一
- 易于定制和重新排序处理步骤
- 便于扩展新的处理步骤

**缺点**：
- 处理链设计可能不够灵活
- 复杂场景下的流控逻辑可能变得复杂
- 可能存在不必要的方法调用开销
- **实现成本较高**，需要设计和实现完整的责任链框架

### 方案4：渐进式函数重构（新增）

**核心思想**：保留现有的事件和回调机制，仅将大函数分解为更小的函数，并添加循环支持。

**主要组件**：
- 现有的`BaseAISystem`类
- 从大函数中提取的若干小函数
- 轻量级的循环控制机制

**流程**：
1. 从现有函数中提取核心处理逻辑为私有方法
2. 添加循环控制参数和逻辑
3. 在适当的回调点添加循环触发机制
4. 保持现有事件处理框架不变

**优点**：
- **实现成本最低**，改动最小
- 不引入新的概念和框架
- 能快速实现核心需求
- 便于后续根据需要进一步重构

**缺点**：
- 扩展性相对较低
- 可能在多次循环时出现代码重复
- 不能从根本上解决所有设计问题

## 决策理由

考虑到实现成本和实际需求，我们选择**方案4：渐进式函数重构**作为首选方案。理由如下：

1. 我们目前的主要需求是支持工具调用后的循环响应，而不是彻底重构整个架构
2. 现有的`PartsTracker`和回调机制基本能满足需求，无需创建全新框架
3. 渐进式重构风险低，可以快速实现并验证核心功能
4. 保留了未来向更复杂架构演进的可能性

如果未来需求变得更加复杂，我们可以在这个基础上进一步向方案2（事件驱动）演进。

## 具体实现规划

1. 提取核心功能为独立方法：
```typescript
// 从大函数中提取工具调用处理逻辑
private async executeToolCall(toolCall: ToolCall, tools: Tool[]): Promise<ToolResult> {
  // 工具调用执行逻辑
}

// 提取响应处理逻辑
private async processAIResponseChunk(chunk: ResponseChunk, partsTracker: PartsTracker, callbacks: ResponseCallbacks): Promise<void> {
  // 处理单个响应chunk的逻辑
}

// 提取工具结果反馈逻辑
private async provideToolResultFeedback(result: ToolResult, toolName: string): Promise<void> {
  // 将工具结果反馈给AI的逻辑
}
```

2. 改造主函数添加循环支持：
```typescript
public async processInputStreamWithTools(params: {
  input: string;
  tools: Tool[];
  onChunk?: (chunk: string) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (toolResult: ToolResult) => void;
  onPartsChange?: (parts: MessagePart[]) => void;
  onPartEvent?: (event: PartsTrackerEvent) => void;
  maxIterations?: number; // 新增：最大循环次数
}): Promise<string> {
  // 循环控制逻辑
  let currentInput = params.input;
  let iterations = 0;
  const maxIterations = params.maxIterations || 3; // 默认最多3次循环
  
  while (iterations < maxIterations) {
    // 处理一轮对话
    const result = await this.processSingleIteration(currentInput, params);
    
    // 判断是否需要继续循环
    if (!result.requiresFollowUp) {
      return result.fullResponse;
    }
    
    // 准备下一轮输入
    currentInput = result.nextPrompt || "";
    iterations++;
  }
  
  return "达到最大循环次数限制";
}

// 处理单轮对话的方法
private async processSingleIteration(input: string, params: ProcessParams): Promise<{
  fullResponse: string;
  requiresFollowUp: boolean;
  nextPrompt?: string;
}> {
  // 此处包含原processInputStreamWithTools的核心逻辑
  // 但返回更丰富的结果，包括是否需要继续循环
}
```

3. 添加工具执行后的反馈控制：
```typescript
// 在工具执行完毕后判断是否需要继续循环
private shouldContinueProcessing(toolResult: ToolResult): boolean {
  // 基于工具结果判断是否需要继续对话
  // 例如，可以约定特定的结果格式表示需要继续
  return toolResult.requiresFollowUp === true;
}

// 构建下一轮输入
private buildNextPrompt(toolResult: ToolResult): string {
  // 根据工具结果构建下一轮输入
  return `基于以下结果继续: ${JSON.stringify(toolResult.result)}`;
}
```

## 影响

- **正面影响**：
  - 实现成本低，可以快速交付
  - 代码结构更清晰，函数职责单一
  - 支持工具调用后的循环响应
  - 保留了现有架构的优势

- **潜在风险**：
  - 可能需要额外处理多轮对话中的状态保持
  - 循环控制逻辑可能引入新的复杂性
  - 长期来看架构扩展性有限

## 实现计划

1. 第一阶段：提取核心逻辑为私有方法，不改变现有功能
2. 第二阶段：添加基本的循环控制机制和参数
3. 第三阶段：实现工具执行后的反馈判断逻辑
4. 第四阶段：添加安全措施和日志记录增强
5. 第五阶段：完善文档和单元测试

## 替代方案

如果渐进式重构方案在实现过程中遇到瓶颈，我们可以考虑增量采用方案2（事件驱动）中的部分设计，但仍然避免创建过多新组件和接口。这样可以在保持实现成本可控的同时，获得更好的架构扩展性。 