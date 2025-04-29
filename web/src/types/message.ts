import { ConversationMessage } from "@agentkai/core";


export type Message = ConversationMessage & {
  id?: string;
  timestamp?: Date;
  status?: 'sending' | 'sent' | 'error';
  error?: string;
  messageGroupId?: string;
  type: 'text' | 'tool_call' | 'tool_result';
};
