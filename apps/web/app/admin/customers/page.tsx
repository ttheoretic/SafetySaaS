'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Search, X, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { SectionTitle, StatusBadge, Skeleton, Empty, relTime } from '@/components/admin/ui'

export default function AdminCustomers() {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const customers = useQuery({ queryKey: ['admin', 'customers'], queryFn: () => api.admin.customers() })

  const rows = useMemo(() => {
    const list = customers.data ?? []
    if (!query) return list
    const q = query.toLowerCase()
    return list.filter((c) =>
      (c.company + c.workspace + c.owner + c.plan + c.status).toLowerCase().includes(q),
    )
  }, [customers.data, query])

  return (
    <div className="space-y-5">
      <SectionTitle title="Customers" sub={`${customers.data?.length ?? 0} workspaces`} />

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search company, owner, plan…"
          className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs outline-none focus:border-primary/50"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-medium">Company</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Owner</th>
              <th className="px-3 py-2 font-medium">Users</th>
              <th className="px-3 py-2 font-medium">Joined</th>
              <th className="px-3 py-2 font-medium">Last active</th>
              <th className="px-3 py-2 font-medium">Risk</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-3 py-2.5" colSpan={8}><Skeleton className="h-4 w-full" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10"><Empty label="No customers found" /></td></tr>
            ) : (
              rows.map((c) => (
                <tr
                  key={c.orgId}
                  onClick={() => setOpenId(c.orgId)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40"
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{c.company}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{c.workspace}</div>
                  </td>
                  <td className="px-3 py-2.5 capitalize">{c.plan}</td>
                  <td className="max-w-[180px] truncate px-3 py-2.5 text-muted-foreground">{c.owner}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums">{c.users}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{relTime(c.joined)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{relTime(c.lastActive)}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums">{c.riskScore ?? '—'}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {openId && <CustomerDrawer orgId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function CustomerDrawer({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const detail = useQuery({ queryKey: ['admin', 'customer', orgId], queryFn: () => api.admin.customer(orgId) })
  const d = detail.data

  const onSuccess = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'customer', orgId] })
    qc.invalidateQueries({ queryKey: ['admin', 'customers'] })
  }
  const suspend = useMutation({ mutationFn: () => api.admin.suspend(orgId), onSuccess })
  const reactivate = useMutation({ mutationFn: () => api.admin.reactivate(orgId), onSuccess })
  const reset = useMutation({ mutationFn: () => api.admin.resetSubscription(orgId), onSuccess })

  const [exporting, setExporting] = useState(false)
  async function exportWorkspace() {
    setExporting(true)
    try {
      const data = await api.admin.exportWorkspace(orgId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `riscly-workspace-${d?.org.slug ?? orgId}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-l border-border bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-panel px-4 py-3">
          <h3 className="text-sm font-semibold">{d?.org.name ?? 'Workspace'}</h3>
          <button onClick={onClose} className="rounded-sm p-1 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {detail.isLoading || !d ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Plan" value={<span className="capitalize">{d.org.plan}</span>} />
              <Field label="Status" value={<StatusBadge status={(d.subscription?.status as string) ?? 'free'} />} />
              <Field label="Workspace" value={<span className="font-mono text-xs">{d.org.slug}</span>} />
              <Field label="Joined" value={relTime(d.org.createdAt)} />
              <Field label="AI requests (30d)" value={d.aiUsage.requests} />
              <Field label="AI cost (30d)" value={`$${d.aiUsage.cost}`} />
            </div>

            <Block title="Members">
              {d.members.map((m) => (
                <Row key={m.userId} left={m.email ?? m.userId} right={<span className="capitalize text-muted-foreground">{m.role}</span>} />
              ))}
            </Block>

            <Block title="Projects & integrations">
              {d.projects.length === 0 ? <Empty label="No projects" /> : d.projects.map((p) => (
                <div key={p.id} className="rounded-md border border-border p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">score {p.reliabilityScore ?? '—'}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {p.integrations.map((c, i) => (
                      <span key={i} className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[10px] capitalize">{c.provider}</span>
                    ))}
                    {p.integrations.length === 0 && <span className="text-[11px] text-muted-foreground">no integrations</span>}
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted-foreground">
                    {p.scans.length} scans · {p.scenarios.length} simulations
                  </div>
                </div>
              ))}
            </Block>

            <Block title="Admin actions">
              <div className="grid grid-cols-2 gap-2">
                <ActionBtn label="Suspend workspace" busy={suspend.isPending} onClick={() => suspend.mutate()} danger />
                <ActionBtn label="Reactivate" busy={reactivate.isPending} onClick={() => reactivate.mutate()} />
                <ActionBtn label="Reset subscription" busy={reset.isPending} onClick={() => reset.mutate()} />
                <ActionBtn label="Export workspace" busy={exporting} onClick={exportWorkspace} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Suspending cancels the subscription (revokes app access). Actions are written to the admin audit log.
              </p>
            </Block>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  )
}
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-xs">
      <span className="truncate">{left}</span>
      {right}
    </div>
  )
}
function ActionBtn({ label, onClick, busy, danger }: { label: string; onClick: () => void; busy?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
        danger ? 'border-destructive/30 text-destructive hover:bg-destructive/10' : 'border-border text-foreground hover:bg-accent'
      }`}
    >
      {busy && <Loader2 className="size-3 animate-spin" />}
      {label}
    </button>
  )
}
