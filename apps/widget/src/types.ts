export interface WidgetConfig {
  publicKey: string;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  greeting?: string;
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  confidence?: number;
  escalated?: boolean;
  sources?: Array<{ content: string; similarity: number }>;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  visitorId: string;
  escalated: boolean;
}
