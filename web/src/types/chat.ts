export interface Message {
  id: string;
  content: string;
  isAgent: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  error?: string;
}

export interface Memory {
  id: string;
  content: string;
  category?: string;
  importance?: number;
  timestamp: number;
  tags?: string[];
}

export interface Goal {
  id: string;
  description: string;
  progress: number;
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  memories: Memory[];
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
}