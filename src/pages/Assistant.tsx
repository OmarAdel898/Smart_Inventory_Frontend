import { useState, useRef, useEffect } from 'react';
import { Bot, ChevronDown, Send, Sparkles, Trash2, X } from 'lucide-react';
import { useAssistantStore } from '@/store/assistantStore';
import type { Message, Source } from '@/store/assistantStore';

const SOURCE_TYPE_BADGES: Record<string, string> = {
  contract: 'bg-blue-100 text-blue-700 border border-blue-200',
  catalog: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  negotiation_transcript: 'bg-amber-100 text-amber-700 border border-amber-200',
  report: 'bg-purple-100 text-purple-700 border border-purple-200',
};

const SUGGESTIONS = [
  'Which SKUs are at risk of stockout?',
  'What is the current stock of the Conference Laptop?',
  'What discount did we negotiate with our suppliers?',
];

/* ── Bot Avatar ── */
function BotAvatar({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div
      className={`${className} shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-teal-400 text-white flex items-center justify-center shadow-sm shadow-[#0066CC]/25`}
    >
      <Bot className="w-4 h-4" strokeWidth={2.2} />
    </div>
  );
}

/* ── Collapsible Sources Component ── */
function SourcesPanel({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);

  if (!sources.length) return null;

  return (
    <div className="mt-2.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0066CC] transition-colors"
      >
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
        Sources ({sources.length})
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((src, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    SOURCE_TYPE_BADGES[src.sourceType] ?? 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {src.sourceType.replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {(src.score * 100).toFixed(1)}% match
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed line-clamp-3">{src.content}</p>
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
    <div className="flex items-start gap-2.5 mb-4">
      <BotAvatar className="w-8 h-8 mt-0.5" />
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="ml-2 text-xs font-medium text-slate-400">Thinking…</span>
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
        <div className="bg-[#0066CC] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] shadow-sm shadow-[#0066CC]/25">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 mb-4">
      <BotAvatar className="w-8 h-8 mt-0.5" />
      <div className="max-w-[85%]">
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-2.5 ${
            message.error
              ? 'bg-red-50 border border-red-200'
              : 'bg-white border border-slate-100 shadow-sm'
          }`}
        >
          <p
            className={`text-sm leading-relaxed whitespace-pre-wrap ${
              message.error ? 'text-red-600' : 'text-slate-700'
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
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-400 flex items-center justify-center mb-4 shadow-lg shadow-[#0066CC]/25">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h4 className="text-sm font-bold text-slate-900 mb-1">Ask me anything</h4>
        <p className="text-xs text-slate-500 max-w-[300px] leading-relaxed">{emptyHint}</p>
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="px-3 py-1.5 text-[11px] font-medium rounded-full border border-slate-200 bg-white text-slate-500 hover:border-[#0066CC] hover:text-[#0066CC] hover:bg-blue-50 transition-colors"
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
        className="flex-1 h-11 px-4 rounded-full border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20 transition-all disabled:opacity-50"
      />
      <button
        onClick={send}
        disabled={!input.trim() || loading}
        className="h-11 w-11 rounded-full bg-[#0066CC] hover:bg-[#0052a3] text-white flex items-center justify-center transition-all shadow-md shadow-[#0066CC]/25 hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex-shrink-0"
        aria-label="Send message"
      >
        <Send style={{ width: 18, height: 18 }} />
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
        className={`fixed bottom-6 right-6 z-[80] w-14 h-14 rounded-full bg-[#0066CC] hover:bg-[#0052a3] text-white shadow-lg shadow-[#0066CC]/30 flex items-center justify-center transition-all duration-300 hover:shadow-xl hover:shadow-[#0066CC]/30 hover:scale-105 active:scale-95 ${
          !isOpen ? 'fab-pulse' : ''
        }`}
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
      >
        <X
          className="transition-transform duration-300"
          style={{ width: 26, height: 26, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: isOpen ? 'block' : 'none' }}
        />
        {!isOpen && <Bot style={{ width: 26, height: 26 }} strokeWidth={2.2} />}
      </button>

      {isOpen && (
        <div
          id="assistant-overlay"
          className={`fixed bottom-24 right-6 z-[80] w-[400px] max-h-[560px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden ${
            isClosing ? 'chat-overlay-exit' : 'chat-overlay-enter'
          }`}
          style={{ boxShadow: '0 8px 40px rgba(15, 23, 42, 0.15), 0 2px 8px rgba(15, 23, 42, 0.08)' }}
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-teal-400 flex items-center justify-center shadow-sm shadow-[#0066CC]/25">
                <Bot className="w-4 h-4 text-white" strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">StockSavvy Assistant</h3>
                <p className="text-[10px] text-slate-400 leading-tight flex items-center gap-1">
                  Powered by RAG
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              aria-label="Close assistant"
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 chat-messages-scroll" style={{ minHeight: 320 }}>
            <ChatList emptyHint="I can answer questions about your inventory, vendors, contracts, and more — grounded in your knowledge base." />
          </div>

          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
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
    <div className="mx-auto max-w-4xl h-[calc(100vh-8.75rem)] flex flex-col">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          AI Assistant
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold">
            <Sparkles className="w-3 h-3" />
            AI-Powered
          </span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Ask questions about your inventory, vendors, and contracts. Answers are grounded in your
          knowledge base.
        </p>
      </div>

      <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-teal-400 flex items-center justify-center shadow-sm shadow-[#0066CC]/25">
              <Bot className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">StockSavvy Assistant</h2>
              <p className="text-[11px] text-slate-400 leading-tight">Powered by RAG — grounded answers</p>
            </div>
          </div>
          <button
            onClick={() => useAssistantStore.getState().clear()}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0066CC] transition-colors"
          >
            <Trash2 style={{ width: 14, height: 14 }} />
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 chat-messages-scroll">
          <ChatList emptyHint="I can answer questions about your inventory, vendors, contracts, and more — grounded in your knowledge base." />
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <ChatInput inputRef={inputRef} />
        </div>
      </div>
    </div>
  );
}