'use client'

import { useQuery } from '@tanstack/react-query'
import { Sparkles, Hash, ArrowDownToLine, ArrowUpFromLine, DollarSign, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { Kpi, KpiSkeletonGrid, Panel, SectionTitle, LineChart, BarChart, Empty, usd, relTime } from '@/components/admin/ui'

export default function AdminAiUsage() {
  const q = useQuery({ queryKey: ['admin', 'ai-usage'], queryFn: () => api.admin.aiUsage() })
  const d = q.data

  return (
    <div className="space-y-6">
      <SectionTitle title="AI Usage" sub="LLM requests, tokens and cost across all workspaces (last 30 days)." />

      {q.isLoading || !d ? (
        <KpiSkeletonGrid count={6} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Total requests" value={d.cards.totalRequests} icon={<Sparkles className="size-4" />} accent />
          <Kpi label="Total tokens" value={d.cards.totalTokens.toLocaleString()} icon={<Hash className="size-4" />} />
          <Kpi label="Input tokens" value={d.cards.inputTokens.toLocaleString()} icon={<ArrowDownToLine className="size-4" />} />
          <Kpi label="Output tokens" value={d.cards.outputTokens.toLocaleString()} icon={<ArrowUpFromLine className="size-4" />} />
          <Kpi label="Monthly cost" value={usd(d.cards.monthlyCost)} icon={<DollarSign className="size-4" />} />
          <Kpi label="Avg cost / user" value={usd(d.cards.avgCostPerUser)} icon={<Users className="size-4" />} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Daily AI cost">
          {d ? <LineChart data={d.charts.dailyCost} /> : <Empty label="Loading…" />}
        </Panel>
        <Panel title="Cost per model">
          {d ? <BarChart data={d.charts.byModel.map((m) => ({ label: m.model.replace('claude-', ''), value: Math.round(m.cost) }))} /> : <Empty label="Loading…" />}
        </Panel>
      </div>

      <Panel title="Cost per customer">
        {!d?.customers.length ? (
          <Empty label="No AI usage recorded yet. Usage is logged as customers use chat, predictions and fixes." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 font-medium">Company</th>
                <th className="py-2 font-medium">Model</th>
                <th className="py-2 font-medium">Requests</th>
                <th className="py-2 font-medium">Tokens</th>
                <th className="py-2 font-medium">Cost</th>
                <th className="py-2 font-medium">Last request</th>
              </tr>
            </thead>
            <tbody>
              {d.customers.map((c) => {
                const high = c.cost > (d.cards.avgCostPerUser || 1) * 3
                return (
                  <tr key={c.orgId} className="border-b border-border last:border-0">
                    <td className="py-2 font-medium">{c.company}</td>
                    <td className="py-2 font-mono text-[11px] text-muted-foreground">{c.model.replace('claude-', '')}</td>
                    <td className="py-2 font-mono tabular-nums">{c.requests}</td>
                    <td className="py-2 font-mono tabular-nums">{c.tokens.toLocaleString()}</td>
                    <td className={`py-2 font-mono tabular-nums ${high ? 'font-semibold text-high' : ''}`}>{usd(c.cost)}</td>
                    <td className="py-2 text-muted-foreground">{relTime(c.last)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}
