import { useState, useRef, useEffect } from 'react';
import { useAssistantStore } from '@/store/assistantStore';
import type { Message, Source } from '@/store/assistantStore';

const SOURCE_TYPE_COLORS: Record<string, string> = {
  contract: 'bg-blue-100 text-blue-700',
  catalog: 'bg-emerald-100 text-emerald-700',
  negotiation_transcript: 'bg-amber-100 text-amber-700',
  report: 'bg-purple-100 text-purple-700',
};

const SUGGESTIONS = [
  'Which SKUs are at risk of stockout?',
  'What is the current stock of the Conference Laptop?',
  'What discount did we negotiate with our suppliers?',
];

/* ── Collapsible Sources Component ── */
function SourcesPanel({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);

  if (!sources.length) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-secondary transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
        Sources ({sources.length})
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((src, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-outline-variant bg-surface-container-low p-3 text-xs"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    SOURCE_TYPE_COLORS[src.sourceType] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {src.sourceType.replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  {(src.score * 100).toFixed(1)}% match
                </span>
              </div>
              <p className="text-on-surface leading-relaxed line-clamp-3">{src.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Typing Indicator ── */
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-secondary" style={{ fontSize: 16 }}>
          smart_toy
        </span>
      </div>
      <div className="bg-surface-container rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="ml-2 text-xs text-on-surface-variant">Thinking…</span>
        </div>
      </div>
    </div>
  );
}

/* ── Chat Message Bubble ── */
function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-primary text-on-primary rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="material-symbols-outlined text-secondary" style={{ fontSize: 16 }}>
          smart_toy
        </span>
      </div>
      <div className="max-w-[85%]">
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-2.5 ${
            message.error
              ? 'bg-error-container/30 border border-error/20'
              : 'bg-surface-container'
          }`}
        >
          <p
            className={`text-sm leading-relaxed whitespace-pre-wrap ${
              message.error ? 'text-error' : 'text-on-surface'
            }`}
          >
            {message.content}
          </p>
        </div>
        {message.sources && <SourcesPanel sources={message.sources} />}
      </div>
    </div>
  );
}

/* ── Chat Messages List (reused by overlay + page) ── */
function ChatList({ emptyHint }: { emptyHint: string }) {
  const messages = useAssistantStore((s) => s.messages);
  const loading = useAssistantStore((s) => s.loading);
  const setInput = useAssistantStore((s) => s.setInput);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-8">
        <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
          <span
            className="material-symbols-outlined text-secondary"
            style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}
          >
            smart_toy
          </span>
        </div>
        <h4 className="text-sm font-semibold text-primary mb-1">Ask me anything</h4>
        <p className="text-xs text-on-surface-variant max-w-[300px] leading-relaxed">{emptyHint}</p>
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="px-3 py-1.5 text-[11px] rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {loading && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </>
  );
}

/* ── Input Bar (reused by overlay + page) ── */
function ChatInput({ inputRef }: { inputRef?: React.RefObject<HTMLInputElement> }) {
  const input = useAssistantStore((s) => s.input);
  const loading = useAssistantStore((s) => s.loading);
  const setInput = useAssistantStore((s) => s.setInput);
  const send = useAssistantStore((s) => s.send);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question…"
        disabled={loading}
        className="flex-1 h-11 px-4 rounded-full border border-outline-variant bg-surface-lowest text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all disabled:opacity-50"
      />
      <button
        onClick={send}
        disabled={!input.trim() || loading}
        className="h-11 w-11 rounded-full bg-secondary text-on-secondary flex items-center justify-center transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        aria-label="Send message"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
          send
        </span>
      </button>
    </div>
  );
}

/* ── Floating Overlay (global) ── */
export function AssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = useAssistantStore.getState();
    if (isOpen && inputRef.current && s.input === '') {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  };

  return (
    <>
      <button
        id="assistant-fab"
        onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
        className={`fixed bottom-6 right-6 z-[80] w-14 h-14 rounded-full bg-secondary text-on-secondary shadow-lg shadow-secondary/25 flex items-center justify-center transition-all duration-300 hover:brightness-110 hover:shadow-xl hover:scale-105 active:scale-95 ${
          !isOpen ? 'fab-pulse' : ''
        }`}
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
      >
        <span
          className="material-symbols-outlined transition-transform duration-300"
          style={{
            fontSize: 26,
            fontVariationSettings: "'FILL' 1",
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          {isOpen ? 'close' : 'smart_toy'}
        </span>
      </button>

      {isOpen && (
        <div
          id="assistant-overlay"
          className={`fixed bottom-24 right-6 z-[80] w-[400px] max-h-[560px] flex flex-col bg-surface-lowest rounded-2xl border border-outline-variant shadow-2xl overflow-hidden ${
            isClosing ? 'chat-overlay-exit' : 'chat-overlay-enter'
          }`}
          style={{ boxShadow: '0 8px 40px rgba(31, 42, 68, 0.12), 0 2px 8px rgba(31, 42, 68, 0.08)' }}
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline-variant bg-surface-container-low/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
                >
                  smart_toy
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary leading-tight">StockSavvy Assistant</h3>
                <p className="text-[10px] text-on-surface-variant leading-tight">Powered by RAG</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
              aria-label="Close assistant"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                close
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 chat-messages-scroll" style={{ minHeight: 320 }}>
            <ChatList emptyHint="I can answer questions about your inventory, vendors, contracts, and more — grounded in your knowledge base." />
          </div>

          <div className="border-t border-outline-variant bg-surface-container-low/30 px-4 py-3">
            <ChatInput inputRef={inputRef} />
          </div>
        </div>
      )}
    </>
  );
}

/* ── Full Page: /assistant ── */
export default function Assistant() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto max-w-4xl h-[calc(100vh-8rem)]">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-primary">AI Assistant</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Ask questions about your inventory, vendors, and contracts. Answers are grounded in your
          knowledge base.
        </p>
      </div>

      <div className="flex flex-col h-full rounded-xl border border-outline-variant bg-surface-lowest overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
              >
                smart_toy
              </span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-primary leading-tight">StockSavvy Assistant</h2>
              <p className="text-[11px] text-on-surface-variant leading-tight">Powered by RAG — grounded answers</p>
            </div>
          </div>
          <button
            onClick={() => useAssistantStore.getState().clear()}
            className="flex items-center gap-1 text-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              delete_sweep
            </span>
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 chat-messages-scroll">
          <ChatList emptyHint="I can answer questions about your inventory, vendors, contracts, and more — grounded in your knowledge base." />
        </div>

        <div className="border-t border-outline-variant bg-surface-container-low/30 px-6 py-4">
          <ChatInput inputRef={inputRef} />
        </div>
      </div>
    </div>
  );
}