'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Bug, Lightbulb, Wrench, HelpCircle, ThumbsUp, Loader2 } from 'lucide-react'
import { api, type AdminFeedback } from '@/lib/api'
import { SectionTitle, StatusBadge, Panel, Empty, Skeleton, relTime } from '@/components/admin/ui'
import { cn } from '@/lib/utils'

const CATEGORY = [
  { id: 'all', label: 'All', icon: null },
  { id: 'bug', label: 'Bug', icon: Bug },
  { id: 'feature', label: 'Feature', icon: Lightbulb },
  { id: 'improvement', label: 'Improvement', icon: Wrench },
  { id: 'question', label: 'Question', icon: HelpCircle },
] as const

const STATUSES = ['open', 'planned', 'in_progress', 'completed', 'archived']

export default function AdminFeedbackPage() {
  const qc = useQueryClient()
  const [cat, setCat] = useState<string>('all')
  const q = useQuery({ queryKey: ['admin', 'feedback'], queryFn: () => api.admin.feedback() })

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => api.admin.updateFeedback(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'feedback'] }),
  })

  const rows = useMemo(
    () => (q.data ?? []).filter((f) => cat === 'all' || f.category === cat),
    [q.data, cat],
  )

  return (
    <div className="space-y-5">
      <SectionTitle title="Feedback" sub="Triage product feedback submitted from inside the app." />

      <div className="flex flex-wrap gap-1.5">
        {CATEGORY.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
              cat === c.id ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {c.icon && <c.icon className="size-3.5" />}
            {c.label}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : rows.length === 0 ? (
        <Panel><Empty label="No feedback in this category yet" /></Panel>
      ) : (
        <div className="space-y-3">
          {rows.map((f) => (
            <FeedbackCard key={f.id} f={f} busy={update.isPending} onPatch={(patch) => update.mutate({ id: f.id, patch })} />
          ))}
        </div>
      )}
    </div>
  )
}

function FeedbackCard({ f, onPatch, busy }: { f: AdminFeedback; onPatch: (p: Record<string, unknown>) => void; busy: boolean }) {
  const [reply, setReply] = useState(f.adminReply ?? '')
  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{f.title}</span>
            <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[10px] capitalize text-muted-foreground">{f.category}</span>
            <StatusBadge status={f.status} />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            {f.workspace && <span>{f.workspace}</span>}
            <span className="inline-flex items-center gap-1"><ThumbsUp className="size-3" /> {f.votes}</span>
            <span>{relTime(f.createdAt)}</span>
          </div>
        </div>
        <select
          value={f.status}
          disabled={busy}
          onChange={(e) => onPatch({ status: e.target.value })}
          className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-xs capitalize outline-none"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply to the customer…"
          className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary/50"
        />
        <button
          onClick={() => onPatch({ adminReply: reply })}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : null} Reply
        </button>
        <button
          onClick={() => onPatch({ status: 'archived' })}
          disabled={busy}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Archive
        </button>
      </div>
    </div>
  )
}
