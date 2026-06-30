'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, TriangleAlert, ShieldAlert, Clock, CheckCircle2 } from 'lucide-react'
import { useRisks, useScanMeta, useActiveProject } from '@/lib/use-project-data'
import { SeverityDot } from '@/components/ui/severity'
import type { Severity } from '@/lib/riscly-data'
import { cn } from '@/lib/utils'

type Note = {
  id: string
  kind: 'risk' | 'reminder'
  severity: Severity | 'ok'
  title: string
  sub?: string
  href: string
}

/** Notification center: surfaces the workspace's critical/high findings and a
 *  reminder when the latest scan is getting stale. Derived from real scan data. */
export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { risks } = useRisks()
  const { lastScanAt } = useScanMeta()
  const { projectId } = useActiveProject()

  const notes = useMemo<Note[]>(() => {
    const out: Note[] = []
    const ranked = [...risks]
      .filter((r) => r.severity === 'critical' || r.severity === 'high')
      .sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1))
      .slice(0, 8)
    for (const r of ranked) {
      out.push({
        id: r.id,
        kind: 'risk',
        severity: r.severity,
        title: r.title,
        sub: `${r.severity.toUpperCase()} · ${r.category ?? 'risk'}`,
        href: '/risks',
      })
    }
    // Stale-scan reminder.
    if (lastScanAt) {
      const days = Math.floor((Date.now() - new Date(lastScanAt).getTime()) / 86400_000)
      if (days >= 7) {
        out.unshift({
          id: 'stale-scan',
          kind: 'reminder',
          severity: 'ok',
          title: 'Re-scan recommended',
          sub: `Last scan was ${days} days ago`,
          href: '/architecture',
        })
      }
    }
    return out
  }, [risks, lastScanAt])

  const critical = risks.filter((r) => r.severity === 'critical').length
  const badge = notes.filter((n) => n.kind === 'risk').length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        className="relative flex size-8 items-center justify-center rounded-md border border-border bg-background hover:border-muted-foreground/40"
      >
        <Bell className="size-4 text-muted-foreground" />
        {badge > 0 && (
          <span
            className={cn(
              'absolute -right-1 -top-1 flex min-w-[15px] items-center justify-center rounded-full px-1 text-[9px] font-semibold text-white',
              critical > 0 ? 'bg-critical' : 'bg-high',
            )}
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notifications</span>
              {badge > 0 && <span className="font-mono text-[10px] text-muted-foreground">{badge} active</span>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!projectId ? (
                <Empty label="Select a repository to see alerts." />
              ) : notes.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 px-3 py-8 text-center">
                  <CheckCircle2 className="size-6 text-ok" />
                  <p className="text-sm font-medium">All clear</p>
                  <p className="text-xs text-muted-foreground">No critical or high risks right now.</p>
                </div>
              ) : (
                notes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { setOpen(false); router.push(n.href) }}
                    className="flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-accent/50"
                  >
                    {n.kind === 'reminder' ? (
                      <Clock className="mt-0.5 size-4 shrink-0 text-medium" />
                    ) : n.severity === 'critical' ? (
                      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-critical" />
                    ) : (
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-high" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{n.title}</div>
                      {n.sub && <div className="truncate font-mono text-[10px] text-muted-foreground">{n.sub}</div>}
                    </div>
                    {n.kind === 'risk' && <SeverityDot severity={n.severity as Severity} />}
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => { setOpen(false); router.push('/risks') }}
              className="w-full border-t border-border px-3 py-2 text-center text-xs font-medium text-primary hover:bg-accent/40"
            >
              View all risks
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return <p className="px-3 py-8 text-center text-xs text-muted-foreground">{label}</p>
}
