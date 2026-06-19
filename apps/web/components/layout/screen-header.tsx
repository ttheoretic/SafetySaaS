import { cn } from '@/lib/utils'

export function ScreenHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 py-3',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function ActionButton({
  children,
  variant = 'default',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost'
}) {
  const variants = {
    default:
      'border border-border bg-panel hover:border-muted-foreground/40 text-foreground',
    primary:
      'bg-primary text-primary-foreground hover:bg-primary/90 font-medium',
    ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
  }
  return (
    <button
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
