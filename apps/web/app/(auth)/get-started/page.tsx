'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Github, Loader2, ScanSearch, Sparkles, ServerCog,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';
import type { SystemGraph } from '@riscly/shared';
import { SystemDiagram } from '@/components/dashboard/system-diagram';

type Step = 'workspace' | 'connect' | 'scan' | 'result';

const STEP_ORDER: Step[] = ['workspace', 'connect', 'scan', 'result'];
const STEP_LABELS: Record<Step, string> = {
  workspace: 'Workspace',
  connect: 'Connect',
  scan: 'Initial scan',
  result: 'Reliability score',
};

function Gauge({ score }: { score: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const dash = c * 0.75;
  const progress = dash * (score / 100);
  const color = score >= 80 ? 'var(--primary)' : score >= 60 ? 'var(--warning)' : 'var(--destructive)';
  return (
    <div className="relative flex size-48 items-center justify-center">
      <svg viewBox="0 0 180 180" className="size-full -rotate-[135deg]">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--secondary)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
        <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${progress} ${c}`} style={{ transition: 'stroke-dasharray 0.1s linear' }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-6xl font-semibold tabular-nums text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground">Reliability Score</span>
      </div>
    </div>
  );
}

export default function GetStartedPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>('workspace');
  const [workspace, setWorkspace] = useState('');
  const [projectName, setProjectName] = useState('My SaaS');
  const [projectId, setProjectId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // final result
  const [targetScore, setTargetScore] = useState(0);
  const [shownScore, setShownScore] = useState(0);
  const [findings, setFindings] = useState<{ title: string; severity: string }[]>([]);
  const [graph, setGraph] = useState<SystemGraph | null>(null);
  const [riskyIds, setRiskyIds] = useState<Set<string>>(new Set());

  const stepIdx = STEP_ORDER.indexOf(step);

  // Onboarding is a post-auth, post-paywall wizard. Guard accordingly.
  useEffect(() => {
    if (!hydrated) return;
    if (!token) { router.replace('/login?mode=signup'); return; }
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      try {
        // Returning from Stripe: confirm the session so access is granted
        // immediately, then poll briefly to cover webhook/propagation latency
        // before falling back to the paywall.
        const params = new URLSearchParams(window.location.search);
        const upgraded = params.get('upgraded') === '1';
        const sessionId = params.get('session_id');
        if (upgraded && sessionId) {
          try { await api.confirmCheckout(sessionId); } catch { /* webhook fallback */ }
        }

        let me = await api.me();
        if (cancelled) return;
        for (let i = 0; upgraded && !me.subscription.active && i < 8; i++) {
          await sleep(1500);
          if (cancelled) return;
          me = await api.me();
        }
        if (!me.subscription.active) { router.replace('/billing'); return; }

        // Already has a project → skip the wizard.
        const projects = await api.listProjects();
        if (cancelled) return;
        if (projects.length > 0) { router.replace('/dashboard'); return; }
        setWorkspace(me.activeOrg.name);
        setReady(true);
      } catch {
        if (!cancelled) router.replace('/login');
      }
    })();
    return () => { cancelled = true; };
  }, [hydrated, token, router]);

  async function createProject() {
    setBusy(true); setError(null);
    try {
      const p = await api.createProject(projectName.trim() || 'My SaaS');
      setProjectId(p.id);
      setStep('connect');
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  async function connectGithub() {
    setBusy(true); setError(null);
    try {
      const { url } = await api.oauthAuthorizeUrl('github', projectId);
      window.location.href = url;
    } catch {
      setError('GitHub OAuth isn’t configured here — continue with the demo stack.');
      setBusy(false);
    }
  }

  async function runScan() {
    setBusy(true); setError(null);
    setStep('scan');
    try {
      const scan = await api.startScan(projectId);
      const score = scan.reliabilityScore ?? 0;
      let f: { title: string; severity: string; nodeId?: string }[] = [];
      try {
        const scans = await api.listScans(projectId);
        const latest = scans.find((s) => s.id === scan.id) as
          | { graph?: SystemGraph; findings?: { title: string; severity: string; nodeId?: string }[] }
          | undefined;
        f = latest?.findings ?? [];
        if (latest?.graph) setGraph(latest.graph);
        setRiskyIds(new Set(f.filter((x) => x.nodeId).map((x) => x.nodeId as string)));
      } catch { /* ignore */ }
      setFindings(f.slice(0, 3));
      setTargetScore(score);
      setStep('result');
    } catch (err) {
      setError((err as Error).message);
      setStep('connect');
    } finally { setBusy(false); }
  }

  // animated count-up for the "wow" reveal
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (step !== 'result') return;
    const start = performance.now();
    const from = 0, to = targetScore, dur = 1100;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShownScore(Math.round(from + (to - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [step, targetScore]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg">
      {/* progress */}
      <ol className="mb-8 flex items-center gap-2">
        {STEP_ORDER.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
              i < stepIdx ? 'bg-primary text-primary-foreground' : i === stepIdx ? 'border border-primary text-primary' : 'border border-border text-muted-foreground'
            }`}>
              {i + 1}
            </span>
            {i < STEP_ORDER.length - 1 && <span className={`h-px flex-1 ${i < stepIdx ? 'bg-primary' : 'bg-border'}`} />}
          </li>
        ))}
      </ol>

      {step === 'workspace' && (
        <Card icon={<ServerCog className="size-5 text-primary" />} title={`Workspace ready: ${workspace}`} subtitle="Name the first project you want to analyze.">
          <div className="space-y-3">
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="My SaaS"
              className="w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" />
            <Primary busy={busy} label="Create project" onClick={createProject} />
          </div>
        </Card>
      )}

      {step === 'connect' && (
        <Card icon={<Github className="size-5 text-primary" />} title="Connect your stack" subtitle="Connect GitHub so we can map your services — or continue with a demo stack.">
          <div className="space-y-3">
            <button onClick={connectGithub} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/70 disabled:opacity-50">
              <Github className="size-4" /> Connect GitHub
            </button>
            <button onClick={runScan} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              <ScanSearch className="size-4" /> Continue with demo stack
            </button>
          </div>
        </Card>
      )}

      {step === 'scan' && (
        <Card icon={<ScanSearch className="size-5 text-primary" />} title="Scanning your system…" subtitle="Building the dependency graph and running the reliability engine.">
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

          {graph && (
            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card/30 text-left">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                <span className="text-xs font-medium text-foreground">Your system, mapped</span>
                <span className="text-[11px] text-muted-foreground">{graph.nodes.length} modules</span>
              </div>
              <div className="p-3">
                <SystemDiagram graph={graph} risky={riskyIds} minWidth={420} />
              </div>
            </div>
          )}

          {findings.length > 0 && (
            <div className="mt-6 space-y-2 text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top risks we found</p>
              {findings.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2 text-sm">
                  <span className="text-foreground">{f.title}</span>
                  <span className="text-xs capitalize text-destructive">{f.severity}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => router.push('/dashboard')}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
            Go to your dashboard <ArrowRight className="size-4" />
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-center text-sm text-warning">{error}</p>}
      {step !== 'result' && (
        <p className="mt-6 text-center text-xs text-muted-foreground">Step {stepIdx + 1} of {STEP_ORDER.length} · {STEP_LABELS[step]}</p>
      )}
    </div>
  );
}

function Card({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-7">
      <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10">{icon}</div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Primary({ busy, label, onClick }: { busy: boolean; label: string; onClick?: () => void }) {
  return (
    <button type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </button>
  );
}
