import { nanoid } from 'nanoid';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ToolCall } from '../../types/tool-call';
import { ToolResult } from '../../types/ui-message';
import { Logger } from '../../utils/logger';
import { ConversationMessage } from '../conversation';

/**
 * 消息部分类型
 */
export type MessagePart =
    | { type: 'text'; text: string; isComplete?: boolean; messageGroupId: string }
    | { type: 'tool_call'; toolCall: ToolCall; isComplete?: boolean; messageGroupId: string }
    | {
          type: 'tool_result';
          toolResult: ToolResult<string, any, any>;
          isComplete?: boolean;
          messageGroupId: string;
      };

/**
 * Chunk类型
 */
export type MessageChunk =
    | { type: 'text'; text: string }
    | { type: 'tool_call'; toolCall: ToolCall }
    | { type: 'tool_result'; toolResult: ToolResult<string, any, any> };

export enum PartsTrackerEventType {
    PART_ADDED = 'part_added',
    PART_UPDATED = 'part_updated',
    PART_COMPLETED = 'part_completed',
    RESET = 'reset',
}

/**
 * 事件类型
 */
export type PartsTrackerEvent =
    | { type: PartsTrackerEventType.PART_ADDED; part: MessagePart }
    | { type: PartsTrackerEventType.PART_UPDATED; part: MessagePart; index: number }
    | { type: PartsTrackerEventType.PART_COMPLETED; part: MessagePart; index: number }
    | { type: PartsTrackerEventType.RESET };

/**
 * 用于跟踪和聚合流式输出中的chunks的类
 */
export class PartsTracker {
    private logger: Logger;
    private partsSubject: BehaviorSubject<MessagePart[]>;
    private eventSubject: Subject<PartsTrackerEvent>;

    constructor(private readonly messageGroupId: string = nanoid()) {
        this.logger = new Logger('PartsTracker');
        this.partsSubject = new BehaviorSubject<MessagePart[]>([]);
        this.eventSubject = new Subject<PartsTrackerEvent>();
    }

    /**
     * 重置跟踪器状态
     */
    public reset(): void {
        this.partsSubject.next([]);
        this.eventSubject.next({ type: PartsTrackerEventType.RESET });
    }

    /**
     * 处理chunk
     * @param chunk 新的chunk
     */
    public addChunk(chunk: MessageChunk): void {
        const currentParts = this.partsSubject.value;
        const lastPart = currentParts[currentParts.length - 1];

        // 如果最后一个part与当前chunk类型相同，则合并
        if (lastPart?.type === chunk.type) {
            const updatedPart = this.mergePart(lastPart, chunk);
            this.mergeParts(currentParts, updatedPart);
            this.eventSubject.next({
                type: PartsTrackerEventType.PART_UPDATED,
                part: updatedPart,
                index: currentParts.length - 1,
            });
        } else {
            // 如果最后一个part存在且未完成，先将其标记为完成
            if (lastPart && 'isComplete' in lastPart && !lastPart.isComplete) {
                const completedPart = {
                    ...lastPart,
                    isComplete: true,
                };
                this.mergeParts(currentParts, completedPart);
                this.eventSubject.next({
                    type: PartsTrackerEventType.PART_COMPLETED,
                    part: completedPart,
                    index: currentParts.length - 1,
                });
            }
            // 添加新的part
            const newPart = this.createPart(chunk);
            this.addPart(newPart);
            this.eventSubject.next({
                type: PartsTrackerEventType.PART_ADDED,
                part: newPart,
            });
        }
    }

    /**
     * 完成当前处理
     */
    public complete(): void {
        const currentParts = this.partsSubject.value;
        const lastPart = currentParts[currentParts.length - 1];

        if (lastPart && 'isComplete' in lastPart) {
            const completedPart = {
                ...lastPart,
                isComplete: true,
            };
            this.mergeParts(currentParts, completedPart);
            this.eventSubject.next({
                type: PartsTrackerEventType.PART_COMPLETED,
                part: completedPart,
                index: currentParts.length - 1,
            });
        }
    }

    /**
     * 获取所有部分
     */
    public getParts(): MessagePart[] {
        return this.partsSubject.value;
    }

    /**
     * 获取conversation messages, 每个 part 映射成一个message
     */
    public getConversationMessages(): ConversationMessage[] {
        // let assistantMessage = '';
        // const toolCalls: any[] = [];
        // const toolResults: Map<string, any> = new Map();

        // // 处理生成的部分
        // this.getParts().forEach((part) => {
        //     if (part.type === 'text') {
        //         assistantMessage += part.text;
        //     } else if (part.type === 'tool_call') {
        //         toolCalls.push({
        //             id: part.toolCall.id,
        //             type: 'function',
        //             function: {
        //                 name: part.toolCall.function.name,
        //                 arguments: part.toolCall.function.arguments,
        //             },
        //         });
        //     } else if (part.type === 'tool_result') {
        //         toolResults.set(part.toolResult.toolCallId, part.toolResult.result);
        //     }
        // });

        // const messages: ConversationMessage[] = [];

        // // 添加助手消息（文本或工具调用）
        // if (assistantMessage || toolCalls.length > 0) {
        //     messages.push({
        //         role: 'assistant',
        //         content: assistantMessage,
        //         ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        //     });

        //     this.logger.debug('添加助手消息到对话历史', {
        //         hasText: !!assistantMessage,
        //         textLength: assistantMessage.length,
        //         toolCallsCount: toolCalls.length,
        //     });
        // }

        // // 添加工具结果消息
        // toolResults.forEach((result, toolCallId) => {
        //     const content = typeof result === 'string' ? result : JSON.stringify(result);
        //     messages.push({
        //         role: 'tool',
        //         content,
        //         tool_call_id: toolCallId,
        //     });

        //     this.logger.debug('添加工具结果消息到对话历史', {
        //         toolCallId,
        //         contentLength: content.length,
        //     });
        // });
        const messages: ConversationMessage[] = this.getParts().map(
            (part): ConversationMessage | undefined => {
                if (part.type === 'text') {
                    return {
                        role: 'assistant',
                        content: part.text,
                    };
                } else if (part.type === 'tool_call') {
                    return {
                        role: 'assistant',
                        content: '',
                        tool_calls: [part.toolCall],
                    };
                } else if (part.type === 'tool_result') {
                    return {
                        role: 'tool',
                        content: JSON.stringify(part.toolResult.result),
                        tool_call_id: part.toolResult.toolCallId,
                    };
                }
            }
        ).filter(Boolean) as ConversationMessage[];

        return messages;
    }

    /**
     * 订阅parts更新
     * @returns 返回一个Observable，可以订阅parts的更新
     */
    public subscribeParts(): Observable<MessagePart[]> {
        return this.partsSubject.asObservable();
    }

    /**
     * 订阅事件
     * @returns 返回一个Observable，可以订阅各种事件
     */
    public subscribeEvents(): Observable<PartsTrackerEvent> {
        return this.eventSubject.asObservable();
    }

    /**
     * 合并parts
     * @param currentParts 当前的parts
     * @param newPart 新的part
     */
    private mergeParts(currentParts: MessagePart[], newPart: MessagePart): void {
        const updatedParts = [...currentParts];
        updatedParts[updatedParts.length - 1] = newPart;
        this.partsSubject.next(updatedParts);
    }

    /**
     * 添加新的part
     * @param part 新的part
     */
    private addPart(part: MessagePart): void {
        this.partsSubject.next([...this.partsSubject.value, part]);
    }

    /**
     * 创建新的part
     * @param chunk 新的chunk
     * @returns 新的part
     */
    private createPart(chunk: MessageChunk): MessagePart {
        switch (chunk.type) {
            case 'text':
                return {
                    type: 'text',
                    text: chunk.text,
                    isComplete: false,
                    messageGroupId: this.messageGroupId,
                };
            case 'tool_call':
                return {
                    type: 'tool_call',
                    toolCall: chunk.toolCall,
                    isComplete: false,
                    messageGroupId: this.messageGroupId,
                };
            case 'tool_result':
                return {
                    type: 'tool_result',
                    toolResult: chunk.toolResult,
                    messageGroupId: this.messageGroupId,
                };
        }
    }

    /**
     * 合并part
     * @param lastPart 最后一个part
     * @param chunk 新的chunk
     * @returns 合并后的part
     */
    private mergePart(lastPart: MessagePart, chunk: MessageChunk): MessagePart {
        switch (chunk.type) {
            case 'text':
                if (lastPart.type === 'text') {
                    return {
                        type: 'text',
                        text: lastPart.text + chunk.text,
                        isComplete: false,
                        messageGroupId: lastPart.messageGroupId,
                    };
                }
                break;
            case 'tool_call':
                if (lastPart.type === 'tool_call') {
                    return {
                        type: 'tool_call',
                        toolCall: {
                            type: 'function',
                            id: lastPart.toolCall.id + chunk.toolCall.id,
                            function: {
                                name:
                                    lastPart.toolCall.function.name + chunk.toolCall.function.name,
                                arguments:
                                    lastPart.toolCall.function.arguments +
                                    chunk.toolCall.function.arguments,
                            },
                        },
                        isComplete: false,
                        messageGroupId: lastPart.messageGroupId,
                    };
                }
                break;
            case 'tool_result':
                // 工具结果通常不需要合并
                return this.createPart(chunk);
        }
        // 如果类型不匹配，返回新的part
        return this.createPart(chunk);
    }
}
