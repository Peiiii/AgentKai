# ADR 002: 迭代工具调用的对话内容存储设计

## 状态

提议

## 背景

在实现AI系统支持循环工具调用功能后，我们需要确保每轮迭代中的对话内容和工具调用结果能被适当地保存在对话历史中。这对于保持对话连贯性和上下文一致性至关重要，尤其是对于多轮迭代的工具调用场景。

当前系统中，我们已经实现了`processInputStreamWithTools`函数的重构，支持多轮迭代工具调用。然而，对话内容和工具调用结果的存储机制尚未完善，可能导致在后续迭代中丢失上下文信息。

我们的`ConversationManager`使用OpenAI的消息格式，包括`user`、`assistant`、`system`和`tool`消息类型，它们已经能够表达基本的对话结构。我们需要设计一种方法，将`PartsTracker`中的消息部分恰当地转换并存储到`ConversationManager`中。

## 决策

我们决定在每轮迭代结束时，将当前轮次中生成的AI响应和工具调用结果添加到`ConversationManager`的历史中，使用OpenAI原生的消息格式，从而保持系统的一致性并支持多轮对话。

## 方案比较

### 方案1：直接映射PartsTracker部分到ConversationMessage

**核心思想**：将PartsTracker中的每个部分直接映射到相应的OpenAI消息类型。

**实现方式**：
```typescript
// 在processSingleIteration的末尾
partsTracker.getParts().forEach(part => {
  if (part.type === 'text') {
    this.conversation.addMessage({
      role: 'assistant',
      content: part.text
    });
  } else if (part.type === 'tool_call') {
    // 创建OpenAI格式的tool_calls
    this.conversation.addMessage({
      role: 'assistant',
      content: '',
      tool_calls: [{
        id: part.toolCall.id,
        type: 'function',
        function: {
          name: part.toolCall.function.name,
          arguments: part.toolCall.function.arguments
        }
      }]
    });
  } else if (part.type === 'tool_result') {
    this.conversation.addMessage({
      role: 'tool',
      content: typeof part.toolResult.result === 'string' 
        ? part.toolResult.result 
        : JSON.stringify(part.toolResult.result),
      tool_call_id: part.toolResult.toolCallId
    });
  }
});
```

**优点**：
- 直接使用OpenAI的原生消息格式
- 不需要额外的数据结构或格式转换
- 完全兼容现有的ConversationManager

**缺点**：
- 可能需要处理非字符串类型的工具结果
- PartsTracker中的某些细节信息可能无法完全映射

### 方案2：合并同类型的消息部分

**核心思想**：将PartsTracker中同类型的部分合并为单个消息，减少消息数量。

**实现方式**：
```typescript
// 在processSingleIteration的末尾
let assistantMessage = '';
const toolCalls: any[] = [];
const toolResults: Map<string, any> = new Map();

// 收集和合并消息
partsTracker.getParts().forEach(part => {
  if (part.type === 'text') {
    assistantMessage += part.text;
  } else if (part.type === 'tool_call') {
    toolCalls.push({
      id: part.toolCall.id,
      type: 'function',
      function: {
        name: part.toolCall.function.name,
        arguments: part.toolCall.function.arguments
      }
    });
  } else if (part.type === 'tool_result') {
    toolResults.set(part.toolResult.toolCallId, part.toolResult.result);
  }
});

// 添加助手消息
if (assistantMessage || toolCalls.length > 0) {
  this.conversation.addMessage({
    role: 'assistant',
    content: assistantMessage,
    ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {})
  });
}

// 添加工具结果消息
toolResults.forEach((result, toolCallId) => {
  this.conversation.addMessage({
    role: 'tool',
    content: typeof result === 'string' ? result : JSON.stringify(result),
    tool_call_id: toolCallId
  });
});
```

**优点**：
- 减少消息数量，更加简洁
- 保持对话流的连贯性
- 仍然使用标准的OpenAI消息格式

**缺点**：
- 实现稍微复杂
- 合并可能导致部分上下文细节丢失
- 需要处理不同数据类型的转换

### 方案3：使用单个迭代消息组

**核心思想**：为每轮迭代创建一组相关的消息，使用特定的标记将它们关联起来。

**实现方式**：
```typescript
// 在processSingleIteration的开始
const iterationId = `iteration_${Date.now()}`;

// 在结束时添加消息
const textParts = partsTracker.getParts().filter(p => p.type === 'text');
const toolCallParts = partsTracker.getParts().filter(p => p.type === 'tool_call');
const toolResultParts = partsTracker.getParts().filter(p => p.type === 'tool_result');

// 添加文本响应
if (textParts.length > 0) {
  const combinedText = textParts.map(p => p.text).join('');
  this.conversation.addMessage({
    role: 'assistant',
    content: combinedText,
    name: iterationId
  });
}

// 添加工具调用
if (toolCallParts.length > 0) {
  const toolCalls = toolCallParts.map(p => ({
    id: p.toolCall.id,
    type: 'function',
    function: {
      name: p.toolCall.function.name,
      arguments: p.toolCall.function.arguments
    }
  }));
  
  this.conversation.addMessage({
    role: 'assistant',
    content: '',
    tool_calls: toolCalls,
    name: iterationId
  });
}

// 添加工具结果
toolResultParts.forEach(p => {
  this.conversation.addMessage({
    role: 'tool',
    content: typeof p.toolResult.result === 'string' 
      ? p.toolResult.result 
      : JSON.stringify(p.toolResult.result),
    tool_call_id: p.toolResult.toolCallId,
    name: iterationId
  });
});
```

**优点**：
- 可以识别和跟踪每轮迭代的消息
- 便于后续分析和处理
- 保留了完整的上下文信息

**缺点**：
- 实现最复杂
- 需要额外的字段（name）来标识迭代
- 可能不符合OpenAI API的严格规范

## 决策理由

考虑到实现简洁性、兼容性和功能完整性，我们选择**方案2：合并同类型的消息部分**作为首选方案。理由如下：

1. 它保持了消息结构的简洁性，合并同类型的部分减少了冗余
2. 完全兼容OpenAI的消息格式，无需额外扩展
3. 在保留关键信息的同时减少了消息总量
4. 实现相对简单，不需要复杂的数据转换
5. 适合渐进式实现策略，易于与现有重构方案集成

## 实现计划

1. 在`processSingleIteration`方法结束前，添加代码将当前迭代的内容转换并添加到对话历史中
2. 确保对象类型的工具结果正确序列化为字符串
3. 添加适当的日志记录，便于调试和追踪
4. 在每个迭代开始时确保已有最新的对话历史
5. 为特殊情况（如错误）添加处理逻辑

## 代码示例

```typescript
private async processSingleIteration(params: {/*...*/}): Promise<{/*...*/}> {
  // ... 现有处理逻辑 ...
  
  // 在方法末尾添加以下代码
  // 收集当前迭代生成的消息部分
  let assistantMessage = '';
  const toolCalls: any[] = [];
  const toolResults: Map<string, any> = new Map();
  
  // 处理生成的部分
  partsTracker.getParts().forEach(part => {
    if (part.type === 'text') {
      assistantMessage += part.text;
    } else if (part.type === 'tool_call') {
      toolCalls.push({
        id: part.toolCall.id,
        type: 'function',
        function: {
          name: part.toolCall.function.name,
          arguments: part.toolCall.function.arguments
        }
      });
    } else if (part.type === 'tool_result') {
      toolResults.set(part.toolResult.toolCallId, part.toolResult.result);
    }
  });
  
  // 添加助手消息（文本或工具调用）
  if (assistantMessage || toolCalls.length > 0) {
    this.conversation.addMessage({
      role: 'assistant',
      content: assistantMessage,
      ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {})
    });
    
    this.logger.debug('添加助手消息到对话历史', {
      hasText: !!assistantMessage,
      toolCallsCount: toolCalls.length
    });
  }
  
  // 添加工具结果消息
  toolResults.forEach((result, toolCallId) => {
    const content = typeof result === 'string' ? result : JSON.stringify(result);
    this.conversation.addMessage({
      role: 'tool',
      content,
      tool_call_id: toolCallId
    });
    
    this.logger.debug('添加工具结果消息到对话历史', {
      toolCallId,
      contentLength: content.length
    });
  });
  
  return {
    response: fullResponse,
    requiresFollowUp,
    nextPrompt,
    lastToolResult
  };
}
```

## 影响

- **正面影响**：
  - 多轮迭代将保持完整的上下文，增强AI的记忆和推理能力
  - 工具调用和结果将被正确记录，便于后续分析和调试
  - 对话历史格式保持标准化，兼容OpenAI API

- **潜在风险**：
  - 长时间对话可能导致历史记录过长，需要考虑截断策略
  - 复杂的工具结果序列化可能引入格式问题
  - 需确保工具调用ID在整个系统中保持一致

## 替代方案

如果方案2在实现过程中遇到挑战，我们可以降级到更简单的方案1，它处理每个部分为独立消息。如果需要更精细的迭代追踪，可以考虑方案3，但需要权衡增加的复杂性。 