import OpenAI from 'openai';

export type ToolCall =OpenAI.ChatCompletionMessageToolCall;
export type ToolCallDelta = OpenAI.ChatCompletionChunk.Choice.Delta.ToolCall;
