/* eslint-disable @typescript-eslint/no-explicit-any */

type JSONValue = null | string | number | boolean | JSONObject | JSONArray;
type JSONObject = {
    [key: string]: JSONValue;
};
type JSONArray = JSONValue[];

export interface ToolCall<NAME extends string, ARGS> {
    /**
  ID of the tool call. This ID is used to match the tool call with the tool result.
   */
    toolCallId: string;
    /**
  Name of the tool that is being called.
   */
    toolName: NAME;
    /**
  Arguments of the tool call. This is a JSON-serializable object that matches the tool's input schema.
     */
    args: ARGS;
}

/**
Typed tool result that is returned by `generateText` and `streamText`.
It contains the tool call ID, the tool name, the tool arguments, and the tool result.
 */
export interface ToolResult<NAME extends string, ARGS, RESULT> {
    /**
  ID of the tool call. This ID is used to match the tool call with the tool result.
     */
    toolCallId: string;
    /**
  Name of the tool that was called.
     */
    toolName: NAME;
    /**
  Arguments of the tool call. This is a JSON-serializable object that matches the tool's input schema.
       */
    args: ARGS;
    /**
  Result of the tool call. This is the result of the tool's execution.
       */
    result: RESULT;
}

/**
Tool invocations are either tool calls or tool results. For each assistant tool call,
there is one tool invocation. While the call is in progress, the invocation is a tool call.
Once the call is complete, the invocation is a tool result.

The step is used to track how to map an assistant UI message with many tool invocations
back to a sequence of LLM assistant/tool result message pairs.
It is optional for backwards compatibility.
 */
export type ToolInvocation =
    | ({
          state: 'partial-call';
          step?: number;
      } & ToolCall<string, any>)
    | ({
          state: 'call';
          step?: number;
      } & ToolCall<string, any>)
    | ({
          state: 'result';
          step?: number;
      } & ToolResult<string, any, any>);
/**
 * An attachment that can be sent along with a message.
 */
export interface Attachment {
    /**
     * The name of the attachment, usually the file name.
     */
    name?: string;
    /**
     * A string indicating the [media type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type).
     * By default, it's extracted from the pathname's extension.
     */
    contentType?: string;
    /**
     * The URL of the attachment. It can either be a URL to a hosted file or a [Data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs).
     */
    url: string;
}
/**
 * AI SDK UI Messages. They are used in the client and to communicate between the frontend and the API routes.
 */
export interface Message {
    /**
  A unique identifier for the message.
     */
    id: string;
    /**
  The timestamp of the message.
     */
    createdAt?: Date;
    /**
  Text content of the message. Use parts when possible.
     */
    content: string;
    /**
  Reasoning for the message.
  
  @deprecated Use `parts` instead.
     */
    reasoning?: string;
    /**
     * Additional attachments to be sent along with the message.
     */
    experimental_attachments?: Attachment[];
    /**
  The 'data' role is deprecated.
     */
    role: 'system' | 'user' | 'assistant' | 'data';
    /**
  For data messages.
  
  @deprecated Data messages will be removed.
     */
    data?: JSONValue;
    /**
     * Additional message-specific information added on the server via StreamData
     */
    annotations?: JSONValue[] | undefined;
    /**
  Tool invocations (that can be tool calls or tool results, depending on whether or not the invocation has finished)
  that the assistant made as part of this message.
  
  @deprecated Use `parts` instead.
     */
    toolInvocations?: Array<ToolInvocation>;
    /**
     * The parts of the message. Use this for rendering the message in the UI.
     *
     * Assistant messages can have text, reasoning and tool invocation parts.
     * User messages can have text parts.
     */
    parts?: Array<
        | TextUIPart
        | ReasoningUIPart
        | ToolInvocationUIPart
        | SourceUIPart
        | FileUIPart
        | StepStartUIPart
    >;
}

export type UIMessage = Message & {
    /**
     * The parts of the message. Use this for rendering the message in the UI.
     *
     * Assistant messages can have text, reasoning and tool invocation parts.
     * User messages can have text parts.
     */
    parts: Array<UIPart>;
};

export type UIPart = TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart | FileUIPart | StepStartUIPart;

/**
 * A text part of a message.
 */
export type TextUIPart = {
    type: 'text';
    /**
     * The text content.
     */
    text: string;
};
/**
 * A reasoning part of a message.
 */
export type ReasoningUIPart = {
    type: 'reasoning';
    /**
     * The reasoning text.
     */
    reasoning: string;
    details: Array<
        | {
              type: 'text';
              text: string;
              signature?: string;
          }
        | {
              type: 'redacted';
              data: string;
          }
    >;
};
/**
 * A tool invocation part of a message.
 */
export type ToolInvocationUIPart = {
    type: 'tool-invocation';
    /**
     * The tool invocation.
     */
    toolInvocation: ToolInvocation;
};
/**
 * A source part of a message.
 */
export type SourceUIPart = {
    type: 'source';
    /**
     * The source.
     */
    source: any;
};
/**
 * A file part of a message.
 */
export type FileUIPart = {
    type: 'file';
    mimeType: string;
    data: string;
};
/**
 * A step boundary part of a message.
 */
export type StepStartUIPart = {
    type: 'step-start';
};
