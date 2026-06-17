'use client';

import { useRef, useState, useEffect } from 'react';
import { Sparkles, Loader2, SendHorizonal, User } from 'lucide-react';
import { api, type ChatMessage } from '@/lib/api';

const SUGGESTIONS = [
  'What is my single biggest reliability risk right now?',
  'Where am I missing redundancy or backups?',
  'Which dependency would hurt revenue most if it failed?',
];

interface ChatProps {
  /** Project to ground answers on; chat is disabled until one exists. */
  projectId?: string;
}

export function AiChat({ projectId }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    if (!projectId) {
      setError('Create a project on the Projects page first, then ask away.');
      return;
    }
    setError(null);
    const next: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await api.tenantChat(projectId, next);
      setMessages([...next, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setMessages(next);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex h-[560px] flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Ask the AI assistant</h2>
        <span className="ml-auto text-xs text-muted-foreground">Grounded on your latest scan</span>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-start justify-center gap-3">
            <p className="text-sm text-muted-foreground">
              Ask anything about your architecture, risks and business impact. Try:
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex gap-2.5'}>
            {m.role === 'assistant' && (
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Sparkles className="size-3.5 text-primary" />
              </div>
            )}
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-[13px] text-primary-foreground'
                  : 'max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-card px-3.5 py-2 text-[13px] leading-relaxed text-foreground'
              }
            >
              {m.content}
            </div>
            {m.role === 'user' && (
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/30">
                <User className="size-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {busy && (
          <div className="flex gap-2.5">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Sparkles className="size-3.5 text-primary" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-card px-3.5 py-2.5 text-[13px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      {error && <p className="px-5 pb-1 text-xs text-warning">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your risks, architecture or revenue impact…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          <SendHorizonal className="size-4" />
        </button>
      </form>
    </section>
  );
}
