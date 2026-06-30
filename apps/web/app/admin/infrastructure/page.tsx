'use client'

import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, MinusCircle, Cpu, Clock, MemoryStick } from 'lucide-react'
import { api } from '@/lib/api'
import { Kpi, Panel, SectionTitle, Skeleton, Empty } from '@/components/admin/ui'

export default function AdminInfrastructure() {
  const q = useQuery({
    queryKey: ['admin', 'infra'],
    queryFn: () => api.admin.infrastructure(),
    refetchInterval: 30_000,
  })
  const d = q.data

  return (
    <div className="space-y-6">
      <SectionTitle title="Infrastructure" sub="Platform health and connected services. Auto-refreshes every 30s." />

      {q.isLoading || !d ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {d.services.map((s) => {
              const ok = s.status === 'operational'
              return (
                <div key={s.name} className="flex items-center gap-3 rounded-xl border border-border bg-panel p-3.5">
                  {ok ? <CheckCircle2 className="size-5 shrink-0 text-ok" /> : <MinusCircle className="size-5 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {ok ? 'Operational' : 'Not configured'}
                      {s.latencyMs != null && ` · ${s.latencyMs}ms`}
                      {s.note && ` · ${s.note}`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Node" value={d.env.nodeVersion} icon={<Cpu className="size-4" />} />
            <Kpi label="Uptime" value={`${Math.floor(d.env.uptimeSec / 3600)}h ${Math.floor((d.env.uptimeSec % 3600) / 60)}m`} icon={<Clock className="size-4" />} />
            <Kpi label="Memory (RSS)" value={`${d.env.memoryMb} MB`} icon={<MemoryStick className="size-4" />} />
          </div>
        </>
      )}

      <Panel title="Notes">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Service status reflects live configuration: a service shows “operational” when its credentials/URL are present
          and (for the database) reachable. Latency and worker/queue metrics populate when Redis is configured.
        </p>
      </Panel>
    </div>
  )
}
