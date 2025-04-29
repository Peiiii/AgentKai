import { Goal, Memory } from "@agentkai/core";
import { Message } from "./message";




export interface ChatState {
  messages: Message[];
  memories: Memory[];
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
}