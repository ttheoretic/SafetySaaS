import { Construction } from 'lucide-react'
import { ScreenHeader } from '@/components/layout/screen-header'

/**
 * Structured placeholder for a navigation destination whose engine isn't built
 * yet. A real page (so the sidebar never 404s) that honestly states what will
 * live here and which roadmap phase delivers it — instead of faking data.
 */
export function ComingSoon({
  title,
  subtitle,
  summary,
  willInclude,
  phase,
}: {
  title: string
  subtitle?: string
  summary: string
  willInclude: string[]
  phase?: string
}) {
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title={title} subtitle={subtitle} />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-panel px-6 py-10 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Construction className="size-6" />
            </div>
            <h2 className="text-sm font-semibold">{title} is on the way</h2>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              {summary}
            </p>

            <div className="mt-6 w-full max-w-md text-left">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                What will live here
              </p>
              <ul className="flex flex-col gap-1.5">
                {willInclude.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {phase && (
              <span className="mt-6 rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {phase}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
