'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3, ExternalLink, CheckCircle2, MinusCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { Kpi, Panel, SectionTitle, LineChart, Empty } from '@/components/admin/ui'
import { ANALYTICS_EVENTS, isAnalyticsEnabled } from '@/lib/analytics'

/**
 * Product analytics. Deep behavioural metrics (DAU/WAU/MAU, retention, session
 * duration, heatmaps, session recordings) come from PostHog. Until PostHog is
 * connected we still show the activity we can derive from our own data and the
 * event taxonomy the product emits.
 */
export default function AdminAnalytics() {
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api.admin.overview() })
  const phEnabled = isAnalyticsEnabled()
  const c = overview.data?.charts

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Analytics"
        sub="Behavioural product analytics, powered by PostHog."
        action={
          <a
            href="https://posthog.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Open PostHog <ExternalLink className="size-3.5" />
          </a>
        }
      />

      <div className="flex items-center gap-2 rounded-lg border border-border bg-panel px-4 py-3 text-sm">
        {phEnabled ? <CheckCircle2 className="size-4 text-ok" /> : <MinusCircle className="size-4 text-muted-foreground" />}
        <span className="font-medium">PostHog {phEnabled ? 'connected' : 'not connected'}</span>
        {!phEnabled && (
          <span className="text-xs text-muted-foreground">
            · set <code className="rounded bg-secondary px-1 font-mono">NEXT_PUBLIC_POSTHOG_KEY</code> and load the snippet to enable DAU/WAU/MAU, retention, funnels and session recordings.
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="DAU" value={phEnabled ? '—' : '—'} icon={<BarChart3 className="size-4" />} hint="via PostHog" />
        <Kpi label="WAU" value="—" hint="via PostHog" />
        <Kpi label="MAU" value="—" hint="via PostHog" />
        <Kpi label="Avg session" value="—" hint="via PostHog" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Signups (from our data)">
          {c ? <LineChart data={c.signups} /> : <Empty label="Loading…" />}
        </Panel>
        <Panel title="Scans / activity (from our data)">
          {c ? <LineChart data={c.scans} color="var(--ok)" /> : <Empty label="Loading…" />}
        </Panel>
      </div>

      <Panel title="Tracked events">
        <p className="mb-3 text-xs text-muted-foreground">
          The product emits these events through a shared <code className="rounded bg-secondary px-1 font-mono">track()</code> helper.
          They power the funnels and retention reports in PostHog.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ANALYTICS_EVENTS.map((e) => (
            <span key={e} className="rounded-sm border border-border bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {e}
            </span>
          ))}
        </div>
      </Panel>
    </div>
  )
}
