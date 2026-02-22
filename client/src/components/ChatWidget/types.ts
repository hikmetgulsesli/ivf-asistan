export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp: number;
}

export interface Source {
  type: 'article' | 'video' | 'faq';
  id: number;
  title: string;
  url?: string;
  timestamp?: string;
}

export interface ChatState {
  sessionId: string;
  messages: Message[];
}
