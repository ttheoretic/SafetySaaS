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
        'flex flex-col rounded-md border border-border bg-panel',
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
