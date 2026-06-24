'use client'

import Link from 'next/link'
import { Cloud, Plug, ArrowRight, CheckCircle2 } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'
import { useConnections } from '@/lib/use-project-data'
import { cn } from '@/lib/utils'

// Providers that represent real infrastructure (vs. code hosts).
const INFRA_PROVIDERS: Record<string, string> = {
  aws: 'AWS',
  gcp: 'Google Cloud',
  azure: 'Azure',
  vercel: 'Vercel',
  render: 'Render',
  railway: 'Railway',
  supabase: 'Supabase',
  neon: 'Neon',
  cloudflare: 'Cloudflare',
}

export function CloudView() {
  const conns = useConnections()
  const infra = (conns.data ?? []).filter((c) => INFRA_PROVIDERS[c.provider])

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Cloud Resources"
        subtitle="Verified infrastructure from your connected providers"
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-start gap-2.5 rounded-md border border-medium/30 bg-medium/10 px-3 py-2.5">
            <Cloud className="mt-0.5 size-4 shrink-0 text-medium" />
            <p className="text-xs leading-relaxed text-foreground">
              Connect a cloud or database provider to inventory its{' '}
              <span className="font-medium">real</span> resources — security groups,
              public exposure, encryption, RLS — instead of inferring them from code.
              Deep read-only resource enumeration ships with the verified-infra collectors.
            </p>
          </div>

          {infra.length === 0 ? (
            <div className="flex flex-col items-center rounded-md border border-dashed border-border bg-panel px-6 py-10 text-center">
              <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Plug className="size-5" />
              </div>
              <p className="text-sm font-medium">No infrastructure connected</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Connect AWS, Supabase, Vercel, Render and more to turn estimated
                architecture into verified facts.
              </p>
              <Link
                href="/settings"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Connect a provider <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
              {infra.map((c) => (
                <div key={c.id} className="flex items-center gap-3 bg-panel px-3 py-3">
                  <div className="flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                    <Cloud className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{INFRA_PROVIDERS[c.provider]}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{c.provider}</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                      c.status === 'active'
                        ? 'border-ok/30 bg-ok/10 text-ok'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    <CheckCircle2 className="size-3" /> {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
