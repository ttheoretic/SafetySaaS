import Link from 'next/link'
import { ArrowLeft, ArrowRight, Info, TriangleAlert, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adjacentDocs } from './docs-nav'

export function DocHeader({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: string }) {
  return (
    <header className="mb-8">
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      )}
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      {lead && <p className="mt-3 text-base leading-relaxed text-muted-foreground">{lead}</p>}
    </header>
  )
}

export function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-20 border-b border-border pb-2 text-xl font-semibold tracking-tight text-foreground">
      {children}
    </h2>
  )
}

export function H3({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="mt-8 scroll-mt-20 text-base font-semibold text-foreground">
      {children}
    </h3>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 leading-relaxed text-muted-foreground">{children}</p>
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mt-4 list-disc space-y-1.5 pl-5 leading-relaxed text-muted-foreground">{children}</ul>
}

export function OL({ children }: { children: React.ReactNode }) {
  return <ol className="mt-4 list-decimal space-y-1.5 pl-5 leading-relaxed text-muted-foreground">{children}</ol>
}

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[12.5px] text-foreground">
      {children}
    </code>
  )
}

export function A({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith('http')
  return (
    <Link
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="font-medium text-primary hover:underline"
    >
      {children}
    </Link>
  )
}

const CALLOUT = {
  info: { icon: Info, cls: 'border-primary/30 bg-primary/5 text-primary' },
  warn: { icon: TriangleAlert, cls: 'border-high/30 bg-high/5 text-high' },
  tip: { icon: Lightbulb, cls: 'border-ok/30 bg-ok/5 text-ok' },
} as const

export function Callout({
  type = 'info',
  title,
  children,
}: {
  type?: keyof typeof CALLOUT
  title?: string
  children: React.ReactNode
}) {
  const { icon: Icon, cls } = CALLOUT[type]
  return (
    <div className={cn('my-5 rounded-lg border p-4', cls.split(' ').slice(0, 2).join(' '))}>
      <div className="flex items-start gap-2.5">
        <Icon className={cn('mt-0.5 size-4 shrink-0', cls.split(' ')[2])} />
        <div className="text-sm leading-relaxed text-foreground/90">
          {title && <p className="mb-1 font-semibold text-foreground">{title}</p>}
          {children}
        </div>
      </div>
    </div>
  )
}

/** A REST endpoint chip: GET /api/projects */
export function Endpoint({ method, path }: { method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; path: string }) {
  const color: Record<string, string> = {
    GET: 'bg-sky-500/15 text-sky-400',
    POST: 'bg-emerald-500/15 text-emerald-400',
    PATCH: 'bg-amber-500/15 text-amber-400',
    PUT: 'bg-blue-500/15 text-blue-400',
    DELETE: 'bg-red-500/15 text-red-400',
  }
  return (
    <div className="mt-5 flex items-center gap-2.5 overflow-x-auto rounded-md border border-border bg-secondary/40 px-3 py-2">
      <span className={cn('shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold', color[method])}>
        {method}
      </span>
      <code className="whitespace-nowrap font-mono text-[12.5px] text-foreground">{path}</code>
    </div>
  )
}

/** Parameter / field reference table. */
export function ParamsTable({
  rows,
}: {
  rows: { name: string; type: string; required?: boolean; desc: React.ReactNode }[]
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2 font-medium">Field</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border last:border-0 align-top">
              <td className="whitespace-nowrap px-3 py-2.5">
                <code className="font-mono text-[12.5px] text-foreground">{r.name}</code>
                {r.required && <span className="ml-1.5 text-[10px] font-medium text-high">required</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-muted-foreground">{r.type}</td>
              <td className="px-3 py-2.5 leading-relaxed text-muted-foreground">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Previous / next navigation, computed from the docs nav order. */
export function DocPager({ href }: { href: string }) {
  const { prev, next } = adjacentDocs(href)
  return (
    <div className="mt-16 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-col rounded-lg border border-border p-4 transition-colors hover:border-muted-foreground/40"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="size-3" /> Previous
          </span>
          <span className="mt-1 text-sm font-medium text-foreground group-hover:text-primary">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          href={next.href}
          className="group flex flex-col rounded-lg border border-border p-4 text-right transition-colors hover:border-muted-foreground/40 sm:col-start-2"
        >
          <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            Next <ArrowRight className="size-3" />
          </span>
          <span className="mt-1 text-sm font-medium text-foreground group-hover:text-primary">{next.title}</span>
        </Link>
      )}
    </div>
  )
}
