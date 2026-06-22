'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Server,
  Database,
  Workflow,
  Cloud,
  Lock,
  Plus,
  Minus,
  Maximize,
} from 'lucide-react'
import {
  type ServiceNode,
  type Edge,
  type Severity,
} from '@/lib/riscly-data'
import { cn } from '@/lib/utils'

const nodeIcon = {
  service: Server,
  database: Database,
  queue: Workflow,
  gateway: Lock,
  external: Cloud,
}

const sevStroke: Record<Severity | 'ok', string> = {
  critical: 'var(--critical)',
  high: 'var(--high)',
  medium: 'var(--medium)',
  low: 'var(--low)',
  ok: 'var(--border)',
}

const sevBorder: Record<Severity | 'ok', string> = {
  critical: 'border-critical/60',
  high: 'border-high/60',
  medium: 'border-medium/60',
  low: 'border-low/60',
  ok: 'border-border',
}
const sevText: Record<Severity | 'ok', string> = {
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
  low: 'text-low',
  ok: 'text-muted-foreground',
}

const W = 150
const H = 56

const CANVAS_W = 1080
const CANVAS_H = 440

export function ArchitectureGraph({
  selectedId,
  onSelect,
  nodes = [],
  edges = [],
}: {
  selectedId: string | null
  onSelect: (n: ServiceNode) => void
  nodes?: ServiceNode[]
  edges?: Edge[]
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [tf, setTf] = useState({ x: 40, y: 30, scale: 1 })
  const pan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const [panning, setPanning] = useState(false)

  const clampScale = (s: number) => Math.min(Math.max(s, 0.4), 2.2)

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    setTf((prev) => {
      const next = clampScale(prev.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12))
      const ratio = next / prev.scale
      // zoom toward cursor
      return {
        scale: next,
        x: px - (px - prev.x) * ratio,
        y: py - (py - prev.y) * ratio,
      }
    })
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return
    pan.current = { x: e.clientX, y: e.clientY, tx: tf.x, ty: tf.y }
    setPanning(true)
  }

  useEffect(() => {
    if (!panning) return
    const move = (e: MouseEvent) => {
      if (!pan.current) return
      setTf((prev) => ({
        ...prev,
        x: pan.current!.tx + (e.clientX - pan.current!.x),
        y: pan.current!.ty + (e.clientY - pan.current!.y),
      }))
    }
    const up = () => {
      pan.current = null
      setPanning(false)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [panning])

  const zoomBy = (factor: number) =>
    setTf((prev) => ({ ...prev, scale: clampScale(prev.scale * factor) }))
  const reset = () => setTf({ x: 40, y: 30, scale: 1 })

  return (
    <div
      ref={viewportRef}
      onMouseDown={onMouseDown}
      className={cn(
        'relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:24px_24px]',
        panning ? 'cursor-grabbing' : 'cursor-grab',
      )}
    >
      {/* zoom controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-md border border-border bg-panel/90 p-1 backdrop-blur">
        <button
          onClick={() => zoomBy(1.2)}
          className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Zoom in"
        >
          <Plus className="size-4" />
        </button>
        <button
          onClick={() => zoomBy(1 / 1.2)}
          className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Zoom out"
        >
          <Minus className="size-4" />
        </button>
        <button
          onClick={reset}
          className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Reset view"
        >
          <Maximize className="size-3.5" />
        </button>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded bg-panel/80 px-2 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur">
        {Math.round(tf.scale * 100)}% · drag to pan · scroll to zoom
      </div>

      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.scale})`,
        }}
      >
      <svg
        className="absolute inset-0"
        width={CANVAS_W}
        height={CANVAS_H}
      >
        {edges.map((e, i) => {
          const a = nodes.find((n) => n.id === e.from)
          const b = nodes.find((n) => n.id === e.to)
          if (!a || !b) return null
          const x1 = a.x + W / 2
          const y1 = a.y + H / 2
          const x2 = b.x + W / 2
          const y2 = b.y + H / 2
          const mx = (x1 + x2) / 2
          return (
            <g key={i}>
              <path
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={sevStroke[e.severity]}
                strokeWidth={e.severity === 'ok' ? 1 : 1.75}
                strokeOpacity={e.severity === 'ok' ? 0.5 : 0.9}
                strokeDasharray={e.severity === 'critical' ? '5 4' : undefined}
              />
              {e.label && (
                <text
                  x={mx}
                  y={(y1 + y2) / 2 - 4}
                  textAnchor="middle"
                  className="fill-current font-mono"
                  style={{ fontSize: 9, fill: sevStroke[e.severity] }}
                >
                  {e.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div className="relative" style={{ width: 1080, height: 440 }}>
        {nodes.map((n) => {
          const Icon = nodeIcon[n.type]
          const active = selectedId === n.id
          return (
            <button
              key={n.id}
              data-node
              onClick={() => onSelect(n)}
              className={cn(
                'absolute flex flex-col gap-1 rounded-md border bg-panel px-2.5 py-2 text-left transition-all hover:bg-panel-2',
                sevBorder[n.severity],
                active && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
              )}
              style={{ left: n.x, top: n.y, width: W, height: H }}
            >
              <div className="flex items-center gap-1.5">
                <Icon className={cn('size-3.5', sevText[n.severity])} />
                <span className="truncate font-mono text-[11px] font-medium">
                  {n.label}
                </span>
                {n.riskCount > 0 && (
                  <span
                    className={cn(
                      'ml-auto rounded-sm px-1 font-mono text-[10px] font-semibold',
                      n.severity === 'critical'
                        ? 'bg-critical/15 text-critical'
                        : n.severity === 'high'
                          ? 'bg-high/15 text-high'
                          : 'bg-medium/15 text-medium',
                    )}
                  >
                    {n.riskCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] capitalize text-muted-foreground">
                  {n.type}
                </span>
                <span className="text-[10px] text-muted-foreground/50">·</span>
                <span className="text-[10px] text-muted-foreground">{n.tech}</span>
              </div>
            </button>
          )
        })}
      </div>
      </div>
    </div>
  )
}
