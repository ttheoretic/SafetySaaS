'use client'

import { useQuery } from '@tanstack/react-query'
import { DollarSign, TrendingUp, CreditCard, Beaker, AlertTriangle, XCircle, UserPlus, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import { Kpi, KpiSkeletonGrid, Panel, SectionTitle, StatusBadge, Empty, usd, relTime } from '@/components/admin/ui'

export default function AdminBilling() {
  const q = useQuery({ queryKey: ['admin', 'billing'], queryFn: () => api.admin.billing() })
  const d = q.data

  return (
    <div className="space-y-6">
      <SectionTitle title="Billing" sub="Revenue and subscriptions (Stripe-backed when configured)." />

      {q.isLoading || !d ? (
        <KpiSkeletonGrid count={7} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
          <Kpi label="MRR" value={usd(d.summary.mrr)} icon={<DollarSign className="size-4" />} accent />
          <Kpi label="ARR" value={usd(d.summary.arr)} icon={<TrendingUp className="size-4" />} />
          <Kpi label="Active subs" value={d.summary.activeSubscriptions} icon={<CreditCard className="size-4" />} />
          <Kpi label="Trials" value={d.summary.trials} icon={<Beaker className="size-4" />} />
          <Kpi label="Past due" value={d.summary.pastDue} icon={<AlertTriangle className="size-4" />} />
          <Kpi label="Canceled" value={d.summary.canceled} icon={<XCircle className="size-4" />} />
          <Kpi label="New this month" value={d.summary.newThisMonth} icon={<UserPlus className="size-4" />} />
        </div>
      )}

      <Panel title="Subscriptions">
        {!d?.customers.length ? (
          <Empty label="No subscriptions yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 font-medium">Customer</th>
                <th className="py-2 font-medium">Plan</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Renewal</th>
                <th className="py-2 font-medium">MRR</th>
                <th className="py-2 font-medium">LTV</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {d.customers.map((c) => (
                <tr key={c.orgId} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">{c.customer}</td>
                  <td className="py-2 capitalize">{c.plan}</td>
                  <td className="py-2"><StatusBadge status={c.status} /></td>
                  <td className="py-2 text-muted-foreground">{c.renewalDate ? relTime(c.renewalDate) : '—'}</td>
                  <td className="py-2 font-mono tabular-nums">{usd(c.mrr)}</td>
                  <td className="py-2 font-mono tabular-nums">{usd(c.ltv)}</td>
                  <td className="py-2 text-right">
                    {c.stripeCustomerId && (
                      <a
                        href={`https://dashboard.stripe.com/customers/${c.stripeCustomerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        Stripe <ExternalLink className="size-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}
