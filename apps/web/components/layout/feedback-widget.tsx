'use client'

import { useState } from 'react'
import { MessageSquarePlus, X, Loader2, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { id: 'bug', label: 'Bug' },
  { id: 'feature', label: 'Feature' },
  { id: 'improvement', label: 'Improvement' },
  { id: 'question', label: 'Question' },
]

/** Lets any signed-in user send product feedback from inside the app. The
 *  submission lands in the admin console's Feedback queue. */
export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('feature')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!title.trim() || !body.trim()) return
    setBusy(true)
    setError(null)
    try {
      await api.submitFeedback({ title: title.trim(), body: body.trim(), category })
      setDone(true)
      setTitle('')
      setBody('')
      setTimeout(() => { setOpen(false); setDone(false) }, 1200)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Send feedback"
        className="hidden size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground sm:flex"
      >
        <MessageSquarePlus className="size-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-panel p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Send feedback</h3>
              <button onClick={() => setOpen(false)} className="rounded-sm p-1 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-ok/15"><Check className="size-5 text-ok" /></span>
                <p className="text-sm font-medium">Thanks — we got it!</p>
              </div>
            ) : (
              <>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs transition-colors',
                        category === c.id ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short summary"
                  className="mb-2 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:border-primary/50"
                />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Tell us what's on your mind…"
                  rows={4}
                  className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-primary/50"
                />
                {error && <p className="mt-1.5 text-[11px] text-destructive">{error}</p>}
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setOpen(false)} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={busy || !title.trim() || !body.trim()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {busy && <Loader2 className="size-3 animate-spin" />} Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
