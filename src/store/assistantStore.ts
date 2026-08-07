import { create } from 'zustand';
import { api } from '@/api/client';

export interface Source {
  content: string;
  sourceType: string;
  score: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  error?: boolean;
}

interface AssistantResponse {
  answer: string;
  sources: Source[];
}

const uid = () => crypto.randomUUID();

interface AssistantState {
  messages: Message[];
  input: string;
  loading: boolean;
  setInput: (value: string) => void;
  send: () => Promise<void>;
  clear: () => void;
}

/**
 * Shared chat state so the floating overlay and the full /assistant page
 * stay perfectly in sync (same conversation, same input).
 */
export const useAssistantStore = create<AssistantState>((set, get) => ({
  messages: [],
  input: '',
  loading: false,

  setInput: (value) => set({ input: value }),

  send: async () => {
    const query = get().input.trim();
    if (!query || get().loading) return;

    const userMsg: Message = { id: uid(), role: 'user', content: query };
    set({ messages: [...get().messages, userMsg], input: '', loading: true });

    try {
      const res = await api.post<AssistantResponse>('/rag/assistant', { query });
      const assistantMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
      };
      set({ messages: [...get().messages, assistantMsg], loading: false });
    } catch (err) {
      const errorMsg: Message = {
        id: uid(),
        role: 'assistant',
        content:
          err instanceof Error
            ? `Sorry, something went wrong: ${err.message}`
            : 'Sorry, an unexpected error occurred. Please try again.',
        error: true,
      };
      set({ messages: [...get().messages, errorMsg], loading: false });
    }
  },

  clear: () => set({ messages: [], input: '' }),
}));