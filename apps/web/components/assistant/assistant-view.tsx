'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Send,
  Bot,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  CircleAlert,
} from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { SeverityBadge } from '@/components/ui/severity'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useActiveProject } from '@/lib/use-project-data'

type Msg = {
  role: 'user' | 'assistant'
  content: string
  refs?: { id: string; severity: 'critical' | 'high' | 'medium'; title: string }[]
  actions?: string[]
}

const suggestions = [
  'What are my most urgent risks right now?',
  'Which finding should I fix first and why?',
  'Prioritize fixes by production impact',
  'Where is my architecture most fragile?',
]

const seed: Msg[] = [
  {
    role: 'assistant',
    content:
      'I have your latest scan — architecture, risks, security findings and code issues — as context. Ask me about your security posture, performance, reliability, or how a change would ripple through your system.',
  },
]

/**
 * Local fallback when there's no connected project or the grounded chat call
 * fails. Generic by design — it never invents findings; the real, grounded
 * answers come from the backend against your latest scan.
 */
function reply(): Msg {
  return {
    role: 'assistant',
    content:
      'I answer against your latest scan — architecture, risks, security findings and code issues. Connect a repository and run a scan, then ask me what to fix first, where your architecture is fragile, or how a change would ripple through your system.',
  }
}

export function AssistantView() {
  const [messages, setMessages] = useState<Msg[]>(seed)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const seeded = useRef(false)
  const { projectId, isLoading } = useActiveProject()

  const scrollToEnd = () =>
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
    )

  const send = async (text: string) => {
    if (!text.trim() || busy) return
    const history = [...messages, { role: 'user', content: text } as Msg]
    setMessages(history)
    setInput('')
    scrollToEnd()

    // Grounded chat against the project's latest scan when a project exists;
    // fall back to the local demo responder otherwise (no backend / demo mode).
    if (projectId) {
      setBusy(true)
      try {
        const res = await api.tenantChat(
          projectId,
          history.map((m) => ({ role: m.role, content: m.content })),
        )
        setMessages((m) => [...m, { role: 'assistant', content: res.reply }])
      } catch {
        setMessages((m) => [...m, reply()])
      } finally {
        setBusy(false)
        scrollToEnd()
      }
      return
    }

    setTimeout(() => {
      setMessages((m) => [...m, reply()])
      scrollToEnd()
    }, 280)
  }

  // Seed a question passed via ?q= (e.g. the risk inspector's "Ask AI"), once
  // the active project has resolved so the chat is grounded against it.
  useEffect(() => {
    if (seeded.current || isLoading) return
    const q =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('q')
        : null
    if (q) {
      seeded.current = true
      send(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="AI Assistant"
        subtitle="Context-aware over your architecture, risks, simulations and code"
      />

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <div className="flex flex-col gap-5">
            {messages.map((m, i) => (
              <Message key={i} msg={m} onAction={(a) => send(a)} />
            ))}
          </div>

          {messages.length <= 1 && (
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <Sparkles className="size-3.5 shrink-0 text-primary" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* composer */}
        <div className="border-t border-border bg-panel p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 focus-within:border-primary/50"
          >
            <Bot className="size-4 text-muted-foreground" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                busy
                  ? 'Riscly is thinking…'
                  : 'Ask about risks, architecture, performance, simulations…'
              }
              disabled={busy}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
            />
            <button
              type="submit"
              className="flex size-7 items-center justify-center rounded-sm bg-primary text-primary-foreground disabled:opacity-40"
              disabled={!input.trim() || busy}
              aria-label="Send"
            >
              <Send className="size-3.5" />
            </button>
          </form>
          <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
            Riscly AI can apply fixes and run simulations on your behalf. Review
            before merging.
          </p>
        </div>
      </div>
    </div>
  )
}

function Message({ msg, onAction }: { msg: Msg; onAction: (a: string) => void }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-md',
          isUser ? 'bg-secondary' : 'bg-primary text-primary-foreground',
        )}
      >
        {isUser ? (
          <span className="font-mono text-[11px] font-semibold">DO</span>
        ) : (
          <ShieldCheck className="size-4" />
        )}
      </div>
      <div className={cn('min-w-0 max-w-[85%]', isUser && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-md px-3 py-2 text-sm leading-relaxed',
            isUser
              ? 'bg-secondary text-foreground'
              : 'border border-border bg-panel text-foreground/90',
          )}
        >
          {msg.content}
        </div>

        {msg.refs && (
          <div className="mt-2 flex flex-col gap-1.5">
            {msg.refs.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
              >
                <CircleAlert
                  className={cn(
                    'size-3.5',
                    r.severity === 'critical'
                      ? 'text-critical'
                      : r.severity === 'high'
                        ? 'text-high'
                        : 'text-medium',
                  )}
                />
                <SeverityBadge severity={r.severity} />
                <span className="truncate text-xs">{r.title}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {r.id}
                </span>
              </div>
            ))}
          </div>
        )}

        {msg.actions && (
          <div className="mt-2 flex flex-wrap gap-2">
            {msg.actions.map((a) => (
              <button
                key={a}
                onClick={() => onAction(a)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <WandSparkles className="size-3" />
                {a}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
