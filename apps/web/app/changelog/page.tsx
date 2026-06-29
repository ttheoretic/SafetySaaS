import { MarketingShell } from '@/components/marketing/page-shell'

export const metadata = { title: 'Changelog — Riscly' }

type Entry = { date: string; version?: string; items: string[] }
const ENTRIES: Entry[] = [
  {
    date: '2026-06-29',
    version: 'Docs & legal',
    items: [
      'New documentation hub with guides and a full API reference.',
      'Privacy Policy, Terms, Cookie Policy, Subprocessors and Impressum.',
    ],
  },
  {
    date: '2026-06',
    version: 'Fixes & flow',
    items: [
      'One-click fixes now commit directly to your repository (with a PR option).',
      '“View fix” explains every finding with tips and references.',
      'Disconnect connected services from Settings.',
      'Password reset and a billing management portal.',
    ],
  },
  {
    date: '2026-05',
    version: 'Analysis depth',
    items: [
      'Dataflow-based SAST, transitive SCA with SBOM, and verified secret detection.',
      'Architecture map deduplicates inferred and verified nodes without dropping any.',
      'GitLab and AWS collectors.',
    ],
  },
]

export default function ChangelogPage() {
  return (
    <MarketingShell
      eyebrow="Resources"
      title="Changelog"
      lead="What’s new in Riscly. Newest first."
    >
      <div className="space-y-8">
        {ENTRIES.map((e) => (
          <div key={e.date} className="border-l-2 border-border pl-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-xs text-muted-foreground">{e.date}</span>
              {e.version && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {e.version}
                </span>
              )}
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {e.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </MarketingShell>
  )
}
