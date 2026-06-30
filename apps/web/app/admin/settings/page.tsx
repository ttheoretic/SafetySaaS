'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Loader2, Check } from 'lucide-react'
import { api, type AdminSettings } from '@/lib/api'
import { Panel, SectionTitle, StatusBadge, Skeleton } from '@/components/admin/ui'

export default function AdminSettingsPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api.admin.settings() })
  const save = useMutation({
    mutationFn: ({ key, value }: { key: string; value: Record<string, unknown> }) => api.admin.updateSetting(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  })
  const d = q.data

  return (
    <div className="space-y-6">
      <SectionTitle title="Settings" sub="Platform-wide configuration." />

      {q.isLoading || !d ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          <ToggleMessage
            title="Maintenance mode"
            sub="Shows a maintenance banner and (optionally) blocks the app."
            initial={d.maintenance}
            busy={save.isPending}
            onSave={(value) => save.mutate({ key: 'maintenance', value })}
          />
          <ToggleMessage
            title="Global announcement"
            sub="A banner shown to all users (e.g. release notes, scheduled maintenance)."
            initial={d.announcement}
            busy={save.isPending}
            onSave={(value) => save.mutate({ key: 'announcement', value })}
          />

          <Panel title="Integrations">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(d.integrations).map(([k, on]) => (
                <div key={k} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span className="capitalize">{k}</span>
                  <StatusBadge status={on ? 'operational' : 'unconfigured'} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="System">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Info label="Version" value={d.system.version} />
              <Info label="Commit" value={d.system.commit ?? '—'} />
              <Info label="Node" value={d.system.node} />
            </dl>
          </Panel>
        </>
      )}
    </div>
  )
}

function ToggleMessage({
  title, sub, initial, onSave, busy,
}: {
  title: string
  sub: string
  initial: { enabled: boolean; message: string }
  onSave: (v: { enabled: boolean; message: string }) => void
  busy: boolean
}) {
  const [enabled, setEnabled] = useState(initial.enabled)
  const [message, setMessage] = useState(initial.message)
  const [saved, setSaved] = useState(false)
  useEffect(() => { setEnabled(initial.enabled); setMessage(initial.message) }, [initial.enabled, initial.message])

  return (
    <Panel title={title}>
      <p className="mb-3 text-xs text-muted-foreground">{sub}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setEnabled((v) => !v)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
        <span className="text-sm">{enabled ? 'Enabled' : 'Disabled'}</span>
      </div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message shown to users…"
        className="mt-3 h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary/50"
      />
      <button
        onClick={() => { onSave({ enabled, message }); setSaved(true); setTimeout(() => setSaved(false), 1500) }}
        disabled={busy}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-3 animate-spin" /> : saved ? <Check className="size-3" /> : null}
        {saved ? 'Saved' : 'Save'}
      </button>
    </Panel>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-2.5">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-xs">{value}</dd>
    </div>
  )
}
