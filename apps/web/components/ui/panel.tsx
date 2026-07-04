import { cn } from '@/lib/utils'

export function Panel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        // Soft elevation: hairline top highlight + deep drop shadow, so panels
        // read as raised cards on the near-black background (LumynAI-style).
        'flex flex-col rounded-lg border border-border bg-panel',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_28px_-18px_rgba(0,0,0,0.8)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PanelHeader({
  title,
  icon,
  action,
  className,
}: {
  title: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border px-3',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}
