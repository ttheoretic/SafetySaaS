'use client'

import { useMemo } from 'react'
import { Boxes, Download } from 'lucide-react'
import { ScreenHeader, ActionButton } from '@/components/layout/screen-header'
import { SeverityBadge } from '@/components/ui/severity'
import { useSystemGraph } from '@/lib/use-project-data'
import { severityOrder, type Severity } from '@/lib/riscly-data'

type Component = {
  name: string
  version: string
  ecosystem: string
  advisories: number
  worst: Severity | null
}

/**
 * Software bill of materials from the active project's scan. Today it lists the
 * components Riscly has resolved (those carrying advisories); full transitive
 * resolution lands with the dedicated SCA engine (roadmap Phase 2).
 */
export function SbomView() {
  const { graph, loading } = useSystemGraph()
  const vulns = graph?.vulnerabilities ?? []
  const resolved = graph?.components ?? []

  const components = useMemo<Component[]>(() => {
    const map = new Map<string, Component>()
    // Seed with the full resolved dependency set (the real SBOM).
    for (const c of resolved) {
      map.set(`${c.ecosystem}:${c.name}@${c.version}`, {
        name: c.name,
        version: c.version,
        ecosystem: c.ecosystem,
        advisories: 0,
        worst: null,
      })
    }
    // Annotate with advisories (and include any vulnerable pkg not in the set).
    for (const v of vulns) {
      const key = `${v.ecosystem}:${v.package}@${v.version}`
      const sev = v.severity as Severity
      const c = map.get(key) ?? {
        name: v.package,
        version: v.version,
        ecosystem: v.ecosystem,
        advisories: 0,
        worst: null,
      }
      c.advisories += 1
      if (!c.worst || severityOrder[sev] < severityOrder[c.worst]) c.worst = sev
      map.set(key, c)
    }
    // Vulnerable first, then alphabetical.
    return [...map.values()].sort(
      (a, b) => b.advisories - a.advisories || a.name.localeCompare(b.name),
    )
  }, [resolved, vulns])

  const exportCycloneDx = () => {
    const bom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      version: 1,
      components: components.map((c) => ({
        type: 'library',
        name: c.name,
        version: c.version,
        purl: `pkg:${c.ecosystem.toLowerCase()}/${c.name}@${c.version}`,
      })),
    }
    const blob = new Blob([JSON.stringify(bom, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'riscly-sbom.cdx.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Dependencies / SBOM"
        subtitle={`${components.length} resolved component${components.length === 1 ? '' : 's'}`}
        actions={
          components.length > 0 ? (
            <ActionButton onClick={exportCycloneDx}>
              <Download className="size-3.5" />
              Export CycloneDX
            </ActionButton>
          ) : undefined
        }
      />

      {components.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Boxes className={loading ? 'size-5 animate-pulse' : 'size-5'} />
            </div>
            <p className="text-sm font-medium">
              {loading ? 'Loading components…' : 'No components resolved yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading
                ? 'Reading the latest scan.'
                : 'Run a scan to resolve your dependencies from their lockfiles (npm, yarn, pnpm, PyPI, Poetry, Go) into a full bill of materials.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-4xl">
            <p className="mb-3 text-[11px] text-muted-foreground">
              Every direct and transitive dependency resolved from your lockfiles
              (npm, yarn, pnpm, PyPI, Poetry, Go). Components with advisories are
              listed first.
            </p>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-panel font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Component</th>
                    <th className="px-3 py-2 font-medium">Ecosystem</th>
                    <th className="px-3 py-2 font-medium">Advisories</th>
                    <th className="px-3 py-2 font-medium">Worst</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {components.map((c) => (
                    <tr key={`${c.ecosystem}:${c.name}@${c.version}`} className="bg-panel hover:bg-accent/30">
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-medium">{c.name}</span>
                        <span className="ml-1 font-mono text-[10px] text-muted-foreground">{c.version}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{c.ecosystem}</td>
                      <td className="px-3 py-2.5 font-mono">{c.advisories}</td>
                      <td className="px-3 py-2.5">
                        {c.worst ? <SeverityBadge severity={c.worst} /> : <span className="text-muted-foreground/50">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
