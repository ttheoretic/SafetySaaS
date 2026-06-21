'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Boxes,
  GitBranch,
  Loader2,
  ScanSearch,
  ServerCog,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { api } from '@/lib/api'
import { useActiveProjectStore } from '@/lib/active-project'
import type { SystemGraph } from '@riscly/shared'

type Step = 'workspace' | 'connect' | 'review' | 'scan' | 'result'

const STEP_ORDER: Step[] = ['workspace', 'connect', 'review', 'scan', 'result']
const STEP_LABELS: Record<Step, string> = {
  workspace: 'Workspace',
  connect: 'Connect',
  review: 'Review stack',
  scan: 'Initial scan',
  result: 'Reliability score',
}

function Gauge({ score }: { score: number }) {
  const r = 70
  const c = 2 * Math.PI * r
  const dash = c * 0.75
  const progress = dash * (score / 100)
  const color =
    score >= 80 ? 'var(--ok)' : score >= 60 ? 'var(--high)' : 'var(--critical)'
  return (
    <div className="relative flex size-48 items-center justify-center">
      <svg viewBox="0 0 180 180" className="size-full -rotate-[135deg]">
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${c}`}
          style={{ transition: 'stroke-dasharray 0.1s linear' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-6xl font-semibold tabular-nums">
          {score}
        </span>
        <span className="text-xs text-muted-foreground">Reliability Score</span>
      </div>
    </div>
  )
}

export default function GetStartedPage() {
  const router = useRouter()
  const { token, hydrated } = useAuth()
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject)
  const [ready, setReady] = useState(false)
  const [step, setStep] = useState<Step>('workspace')
  const [workspace, setWorkspace] = useState('')
  const [projectName, setProjectName] = useState('My SaaS')
  const [projectId, setProjectId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Fatal error while resolving the post-checkout state (kept on-page with a
  // retry instead of bouncing to /login, which would drop the Stripe session).
  const [fatal, setFatal] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  // Set when the user just returned from connecting a provider (OAuth callback).
  const [connected, setConnected] = useState<string | null>(null)
  // Repo selection for a connected GitHub account (scan one repo, not all).
  const [connectionId, setConnectionId] = useState('')
  const [repos, setRepos] = useState<string[]>([])
  const [selectedRepo, setSelectedRepo] = useState('')

  // detected stack (shown in the review step before the scoring scan)
  const [detectedGraph, setDetectedGraph] = useState<SystemGraph | null>(null)

  // final result
  const [targetScore, setTargetScore] = useState(0)
  const [shownScore, setShownScore] = useState(0)
  const [findings, setFindings] = useState<
    { title: string; severity: string }[]
  >([])

  const stepIdx = STEP_ORDER.indexOf(step)

  // Onboarding is a post-auth, post-paywall wizard. Guard accordingly.
  useEffect(() => {
    if (!hydrated) return
    if (!token) {
      router.replace('/login?mode=signup')
      return
    }
    let cancelled = false
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const meSafe = async () => {
      try {
        return await api.me()
      } catch {
        return null
      }
    }
    ;(async () => {
      try {
        setFatal(null)
        const params = new URLSearchParams(window.location.search)
        const upgraded = params.get('upgraded') === '1'
        const sessionId = params.get('session_id')
        const connectedProvider = params.get('connected')
        const connectError = params.get('connect_error')
        // "Add repository": always create a NEW project/repo, don't resume.
        const isNew = params.get('new') === '1' && !connectedProvider
        if (connectedProvider) setConnected(connectedProvider)
        // The provider connect was abandoned/expired (e.g. a password-reset
        // detour). Surface it so the user simply retries instead of being stuck.
        if (connectError)
          setError(
            `The ${connectError} connection wasn’t completed. Please click “Connect ${connectError === 'github' ? 'GitHub' : connectError}” again.`,
          )
        if (upgraded && sessionId) {
          for (let i = 0; i < 4; i++) {
            try {
              if (await api.confirmCheckout(sessionId)) break
            } catch {
              /* retry */
            }
            await sleep(1200)
            if (cancelled) return
          }
        }

        let me = await meSafe()
        if (cancelled) return
        for (let i = 0; upgraded && !me?.subscription.active && i < 8; i++) {
          await sleep(1500)
          if (cancelled) return
          me = await meSafe()
        }
        if (!me) throw new Error('Could not load your account.')
        if (!me.subscription.active) {
          router.replace('/billing')
          return
        }

        setWorkspace(me.activeOrg.name)

        // Only skip the wizard once a project has actually been scanned —
        // unless we're explicitly adding a new repository (start fresh).
        const projects = await api.listProjects()
        if (cancelled) return
        if (!isNew && projects.length > 0) {
          const existing = projects[0]
          let scanned = false
          try {
            const scans = await api.listScans(existing.id)
            scanned = scans.some((s) => s.status === 'succeeded')
          } catch {
            /* treat as unscanned */
          }
          if (cancelled) return
          if (scanned) {
            router.replace('/dashboard')
            return
          }
          setProjectId(existing.id)
          setProjectName(existing.name)
          setStep('connect')
          if (connectedProvider) {
            try {
              const conns = await api.listConnections(existing.id)
              if (cancelled) return
              const conn = conns.find((c) => c.provider === connectedProvider)
              const list = Array.isArray(conn?.metadata?.repos)
                ? (conn!.metadata!.repos as string[])
                : []
              if (conn) setConnectionId(conn.id)
              setRepos(list)
              setSelectedRepo(list[0] ?? '')
            } catch {
              /* ignore — fall back to no picker */
            }
          }
        }
        setReady(true)
      } catch (err) {
        if (!cancelled)
          setFatal((err as Error).message || 'Something went wrong.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrated, token, router, attempt])

  async function createProject() {
    setBusy(true)
    setError(null)
    try {
      const p = await api.createProject(projectName.trim() || 'My SaaS')
      setProjectId(p.id)
      setActiveProject(p.id)
      setStep('connect')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function connectGithub() {
    setBusy(true)
    setError(null)
    try {
      const { url } = await api.oauthAuthorizeUrl('github', projectId, '/get-started')
      window.location.href = url
    } catch {
      setError(
        'GitHub OAuth isn’t configured here — continue with the demo stack.',
      )
      setBusy(false)
    }
  }

  /** First scan after connecting: detect modules/tools, then let the customer
   *  review them before scoring. */
  async function detectScan() {
    setBusy(true)
    setError(null)
    setStep('scan')
    try {
      if (connectionId && selectedRepo) {
        await api.updateConnection(projectId, connectionId, {
          selectedRepos: [selectedRepo],
        })
      }
      const scan = await api.startScan(projectId)
      let g: SystemGraph | null = null
      try {
        const scans = await api.listScans(projectId)
        const latest = scans.find((s) => s.id === scan.id) as
          | { graph?: SystemGraph }
          | undefined
        g = latest?.graph ?? null
      } catch {
        /* ignore */
      }
      setDetectedGraph(g)
      setStep('review')
    } catch (err) {
      setError((err as Error).message)
      setStep('connect')
    } finally {
      setBusy(false)
    }
  }

  async function runScan() {
    setBusy(true)
    setError(null)
    setStep('scan')
    try {
      if (connectionId && selectedRepo) {
        await api.updateConnection(projectId, connectionId, {
          selectedRepos: [selectedRepo],
        })
      }
      const scan = await api.startScan(projectId)
      const score = scan.reliabilityScore ?? 0
      let f: { title: string; severity: string }[] = []
      try {
        const scans = await api.listScans(projectId)
        const latest = scans.find((s) => s.id === scan.id) as
          | { findings?: { title: string; severity: string }[] }
          | undefined
        f = latest?.findings ?? []
      } catch {
        /* ignore */
      }
      setFindings(f.slice(0, 3))
      setTargetScore(score)
      setStep('result')
    } catch (err) {
      setError((err as Error).message)
      setStep('connect')
    } finally {
      setBusy(false)
    }
  }

  // animated count-up for the "wow" reveal
  const raf = useRef<number | null>(null)
  useEffect(() => {
    if (step !== 'result') return
    const start = performance.now()
    const from = 0,
      to = targetScore,
      dur = 1100
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setShownScore(Math.round(from + (to - from) * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [step, targetScore])

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-16 items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">Riscly</span>
        </Link>
      </header>

      <div className="flex flex-1 items-start justify-center px-4 pb-16 pt-6">
        {!ready ? (
          fatal ? (
            <div className="flex min-h-[40vh] w-full max-w-md flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-muted-foreground">
                We couldn&rsquo;t finish setting up your workspace.
              </p>
              <p className="text-sm text-destructive">{fatal}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setAttempt((a) => a + 1)}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Try again
                </button>
                <button
                  onClick={() => router.replace('/billing')}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to plans
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )
        ) : (
          <div className={step === 'review' ? 'w-full max-w-2xl' : 'w-full max-w-lg'}>
            {/* progress */}
            <ol className="mb-8 flex items-center gap-2">
              {STEP_ORDER.map((s, i) => (
                <li key={s} className="flex flex-1 items-center gap-2">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
                      i < stepIdx
                        ? 'bg-primary text-primary-foreground'
                        : i === stepIdx
                          ? 'border border-primary text-primary'
                          : 'border border-border text-muted-foreground'
                    }`}
                  >
                    {i + 1}
                  </span>
                  {i < STEP_ORDER.length - 1 && (
                    <span
                      className={`h-px flex-1 ${i < stepIdx ? 'bg-primary' : 'bg-border'}`}
                    />
                  )}
                </li>
              ))}
            </ol>

            {step === 'workspace' && (
              <Card
                icon={<ServerCog className="size-5 text-primary" />}
                title={`Workspace ready: ${workspace}`}
                subtitle="Name the first project you want to analyze."
              >
                <div className="space-y-3">
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My SaaS"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                  />
                  <Primary
                    busy={busy}
                    label="Create project"
                    onClick={createProject}
                  />
                </div>
              </Card>
            )}

            {step === 'connect' && (
              <Card
                icon={<GitBranch className="size-5 text-primary" />}
                title={connected ? 'Stack connected' : 'Connect your stack'}
                subtitle={
                  connected
                    ? `Your ${connected} account is connected — run the first scan to map your real services.`
                    : 'Connect GitHub so we can map your services — or continue with a demo stack.'
                }
              >
                <div className="space-y-3">
                  {connected ? (
                    <>
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2.5 text-sm font-medium text-ok">
                        <GitBranch className="size-4" /> {connected} connected
                      </div>
                      {repos.length > 0 && (
                        <label className="block space-y-1.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            Repository to scan
                          </span>
                          <select
                            value={selectedRepo}
                            onChange={(e) => setSelectedRepo(e.target.value)}
                            className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                          >
                            {repos.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <button
                        onClick={detectScan}
                        disabled={busy}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        <ScanSearch className="size-4" /> Scan repository
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={connectGithub}
                        disabled={busy}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/70 disabled:opacity-50"
                      >
                        <GitBranch className="size-4" /> Connect GitHub
                      </button>
                      <button
                        onClick={runScan}
                        disabled={busy}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        <ScanSearch className="size-4" /> Continue with demo stack
                      </button>
                    </>
                  )}
                </div>
              </Card>
            )}

            {step === 'review' && (
              <div className="rounded-2xl border border-border bg-card p-7">
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10">
                  <Boxes className="size-5 text-primary" />
                </div>
                <h1 className="mt-4 text-xl font-semibold">We mapped your stack</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Here&rsquo;s what we detected from your repository. Continue to
                  your reliability score.
                </p>

                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Detected modules &amp; tools ({detectedGraph?.nodes.length ?? 0})
                  </p>
                  {detectedGraph && detectedGraph.nodes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {detectedGraph.nodes.map((n) => (
                        <span
                          key={n.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs"
                        >
                          {n.name}
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {n.kind.replace(/_/g, ' ')}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No modules detected yet — we&rsquo;ll score the demo stack.
                    </p>
                  )}
                </div>

                <button
                  onClick={runScan}
                  disabled={busy}
                  className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  Continue to reliability score <ArrowRight className="size-4" />
                </button>
              </div>
            )}

            {step === 'scan' && (
              <Card
                icon={<ScanSearch className="size-5 text-primary" />}
                title="Scanning your system…"
                subtitle="Building the dependency graph and running the reliability engine."
              >
                <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  Mapping services · detecting risks · scoring reliability…
                </div>
              </Card>
            )}

            {step === 'result' && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
                  <Sparkles className="size-3.5" /> Your first reliability score
                </div>
                <div className="mt-4 flex justify-center">
                  <Gauge score={shownScore} />
                </div>

                {findings.length > 0 && (
                  <div className="mt-6 space-y-2 text-left">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Top risks we found
                    </p>
                    {findings.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2 text-sm"
                      >
                        <span>{f.title}</span>
                        <span className="text-xs capitalize text-destructive">
                          {f.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => router.push('/dashboard')}
                  className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Go to your dashboard <ArrowRight className="size-4" />
                </button>
              </div>
            )}

            {error && <p className="mt-4 text-center text-sm text-high">{error}</p>}
            {step !== 'result' && (
              <p className="mt-6 text-center text-xs text-muted-foreground">
                Step {stepIdx + 1} of {STEP_ORDER.length} · {STEP_LABELS[step]}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Card({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-7">
      <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </div>
      <h1 className="mt-4 text-xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  )
}

function Primary({
  busy,
  label,
  onClick,
}: {
  busy: boolean
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </button>
  )
}
