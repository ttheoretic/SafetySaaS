'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3, ExternalLink, CheckCircle2, MinusCircle, Clock, LogOut, Repeat } from 'lucide-react'
import { api } from '@/lib/api'
import { Kpi, KpiSkeletonGrid, Panel, SectionTitle, LineChart, BarChart, Empty } from '@/components/admin/ui'

/**
 * Product analytics, pulled live from PostHog (HogQL) so DAU/WAU/MAU, top
 * pages/features, the funnel, bounce and session duration render here — no need
 * to open PostHog. Configure POSTHOG_API_KEY + POSTHOG_PROJECT_ID on the API.
 */
export default function AdminAnalytics() {
  const q = useQuery({ queryKey: ['admin', 'analytics'], queryFn: () => api.admin.analytics() })
  const d = q.data
  const connected = d?.connected

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Analytics"
        sub="Behavioural product analytics, live from PostHog."
        action={
          <a href="https://posthog.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
            Open PostHog <ExternalLink className="size-3.5" />
          </a>
        }
      />

      <div className="flex items-center gap-2 rounded-lg border border-border bg-panel px-4 py-3 text-sm">
        {connected ? <CheckCircle2 className="size-4 text-ok" /> : <MinusCircle className="size-4 text-muted-foreground" />}
        <span className="font-medium">PostHog {connected ? 'connected' : 'not connected'}</span>
        {!connected && (
          <span className="text-xs text-muted-foreground">
            · set <code className="rounded bg-secondary px-1 font-mono">POSTHOG_API_KEY</code> +{' '}
            <code className="rounded bg-secondary px-1 font-mono">POSTHOG_PROJECT_ID</code> on the API to populate these.
          </span>
        )}
      </div>

      {q.isLoading ? (
        <KpiSkeletonGrid count={6} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi label="DAU" value={d?.dau ?? '—'} icon={<BarChart3 className="size-4" />} accent hint="active today" />
          <Kpi label="WAU" value={d?.wau ?? '—'} hint="last 7 days" />
          <Kpi label="MAU" value={d?.mau ?? '—'} hint="last 30 days" />
          <Kpi label="Avg session" value={d?.avgSessionSec != null ? `${Math.round(d.avgSessionSec / 60)}m ${d.avgSessionSec % 60}s` : '—'} icon={<Clock className="size-4" />} />
          <Kpi label="Bounce rate" value={d?.bounceRatePct != null ? `${d.bounceRatePct}%` : '—'} icon={<LogOut className="size-4" />} />
          <Kpi label="Returning (W/W)" value={d?.returningPct != null ? `${d.returningPct}%` : '—'} icon={<Repeat className="size-4" />} hint="retention" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Daily active users (30d)">
          {d?.dauSeries?.length ? <LineChart data={d.dauSeries} /> : <Empty label={connected ? 'No data yet' : 'Connect PostHog'} />}
        </Panel>
        <Panel title="Funnel conversion (30d)">
          {connected && d?.funnel?.length ? (
            <Funnel steps={d.funnel} />
          ) : (
            <Empty label={connected ? 'No data yet' : 'Connect PostHog'} />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top pages (30d)">
          {d?.topPages?.length ? <BarChart data={d.topPages.slice(0, 8)} /> : <Empty label={connected ? 'No data yet' : 'Connect PostHog'} />}
        </Panel>
        <Panel title="Top features / events (30d)">
          {d?.topFeatures?.length ? (
            <ul className="divide-y divide-border text-sm">
              {d.topFeatures.slice(0, 12).map((f) => (
                <li key={f.label} className="flex items-center justify-between py-1.5">
                  <span className="font-mono text-[12px]">{f.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">{f.value.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty label={connected ? 'No data yet' : 'Connect PostHog'} />
          )}
        </Panel>
      </div>
    </div>
  )
}

function Funnel({ steps }: { steps: { step: string; users: number }[] }) {
  const top = Math.max(1, steps[0]?.users ?? 1)
  return (
    <div className="flex flex-col gap-2">
      {steps.map((s, i) => {
        const pct = Math.round((s.users / top) * 100)
        const conv = i > 0 && steps[i - 1].users > 0 ? Math.round((s.users / steps[i - 1].users) * 100) : null
        return (
          <div key={s.step} className="flex items-center gap-3">
            <span className="w-44 shrink-0 truncate font-mono text-[11px] text-muted-foreground">{s.step}</span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-sm bg-secondary/50">
              <div className="h-full rounded-sm bg-primary/60" style={{ width: `${pct}%` }} />
              <span className="absolute inset-y-0 left-2 flex items-center font-mono text-xs font-semibold">{s.users}</span>
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-[11px] text-ok">{conv != null ? `${conv}%` : ''}</span>
          </div>
        )
      })}
    </div>
  )
}
