'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CodeTab = { label: string; language?: string; code: string }

/** A code panel with optional language tabs and a copy button — the building
 *  block for every example in the docs. */
export function CodeBlock({
  tabs,
  className,
}: {
  tabs: CodeTab[]
  className?: string
}) {
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState(false)
  const current = tabs[active] ?? tabs[0]

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div
      className={cn(
        'group my-4 overflow-hidden rounded-lg border border-border bg-[#0d1117]',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-2 pr-2.5">
        <div className="flex">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActive(i)}
              className={cn(
                'border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                i === active
                  ? 'border-primary text-white'
                  : 'border-transparent text-white/50 hover:text-white/80',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-[12.5px] leading-relaxed">
        <code className="font-mono text-[#e6edf3]">{current.code}</code>
      </pre>
    </div>
  )
}
