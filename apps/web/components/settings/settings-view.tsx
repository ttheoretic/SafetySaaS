'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Database,
  Server,
  Cloud,
  GitBranch,
  Bot,
  Bell,
  ShieldCheck,
  Plug,
  SlidersHorizontal,
  Check,
  Loader2,
  LogOut,
  UserRound,
  CreditCard,
  Mail,
  Download,
  ArrowUpRight,
  ChevronDown,
  KeyRound,
  Lock,
  Plus,
} from 'lucide-react'
import { PLAN_LIMITS, type Plan } from '@riscly/shared'
import { ScreenHeader } from '@/components/layout/screen-header'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { api } from '@/lib/api'
import { updatePassword } from '@/lib/sign-in'
import { useAuth } from '@/lib/auth-store'
import {
  useProjects,
  useActiveProject,
  useAddRepository,
  useAddableRepos,
  useAddRepoFromGrant,
} from '@/lib/use-project-data'
import { useActiveProjectStore } from '@/lib/active-project'
import { cn } from '@/lib/utils'

type Section =
  | 'account'
  | 'repositories'
  | 'billing'
  | 'integrations'
  | 'scanning'
  | 'ai'
  | 'notifications'

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'account', label: 'Account', icon: <UserRound className="size-4" /> },
  { id: 'repositories', label: 'Repositories', icon: <GitBranch className="size-4" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="size-4" /> },
  { id: 'integrations', label: 'Integrations', icon: <Plug className="size-4" /> },
  { id: 'scanning', label: 'Scanning', icon: <ShieldCheck className="size-4" /> },
  { id: 'ai', label: 'AI & Remediation', icon: <Bot className="size-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="size-4" /> },
]

type Integration = {
  name: string
  icon: React.ReactNode
  connected: boolean
  detail?: string
  credential: string
  scope: string
  analyzes: string[]
  note: string
}

type IntegrationGroup = { category: string; items: Integration[] }

const integrationCatalog: IntegrationGroup[] = [
  {
    category: 'Code & version control',
    items: [
      {
        name: 'GitHub',
        icon: <GitBranch className="size-4" />,
        connected: true,
        detail: 'shopist-platform · 14 repositories',
        credential: 'GitHub App installation (OAuth)',
        scope: 'Read-only: code, metadata, pull requests',
        analyzes: [
          'Static code analysis (SAST) on every push',
          'Dependency manifests for vulnerable libraries',
          'Committed secrets & exposed credentials',
          'Inferred architecture from imports & config',
        ],
        note: 'Never requests write access to source. PRs are opened as drafts only when you accept a fix.',
      },
      {
        name: 'GitLab',
        icon: <GitBranch className="size-4" />,
        connected: false,
        credential: 'Project access token',
        scope: 'read_api, read_repository',
        analyzes: [
          'Static code analysis (SAST)',
          'Dependency & license scanning',
          'CI/CD pipeline configuration risks',
        ],
        note: 'Use a project- or group-scoped token, not a personal token, to limit blast radius.',
      },
    ],
  },
  {
    category: 'Hosting & compute',
    items: [
      {
        name: 'Vercel',
        icon: <Cloud className="size-4" />,
        connected: false,
        credential: 'Vercel access token (team-scoped)',
        scope: 'Read: projects, deployments, env var names',
        analyzes: [
          'Exposed vs. encrypted environment variables',
          'Public preview deployments leaking data',
          'Build & framework misconfigurations',
        ],
        note: 'We read env variable names and metadata, never their decrypted values.',
      },
      {
        name: 'Render',
        icon: <Server className="size-4" />,
        connected: false,
        credential: 'Render API key',
        scope: 'Read-only: services, env groups',
        analyzes: [
          'Services exposed to the public internet',
          'Open ports & missing health checks',
          'Service-to-service connection topology',
        ],
        note: 'A read-only key is sufficient — do not provide an owner key.',
      },
      {
        name: 'AWS',
        icon: <Cloud className="size-4" />,
        connected: true,
        detail: 'prod-eks-shopist · us-east-1',
        credential: 'IAM role (cross-account, external ID)',
        scope: 'SecurityAudit + ViewOnlyAccess managed policies',
        analyzes: [
          'Public S3 buckets & overly broad IAM',
          'Security groups open to 0.0.0.0/0',
          'Unencrypted volumes & exposed RDS',
        ],
        note: 'Connect via an assumable IAM role with an external ID instead of long-lived access keys.',
      },
      {
        name: 'Kubernetes',
        icon: <Server className="size-4" />,
        connected: true,
        detail: '3 clusters · 4,010 pods',
        credential: 'Read-only kubeconfig / service account',
        scope: 'get, list, watch on workloads & RBAC',
        analyzes: [
          'Privileged & root containers',
          'Missing network policies',
          'Over-permissive RBAC bindings',
        ],
        note: 'Bind the service account to a read-only ClusterRole — no write or exec permissions needed.',
      },
    ],
  },
  {
    category: 'Databases',
    items: [
      {
        name: 'Supabase',
        icon: <Database className="size-4" />,
        connected: false,
        credential: 'Service-role key + project URL',
        scope: 'Read: schema, RLS policies, auth config',
        analyzes: [
          'Tables with Row Level Security disabled',
          'Overly permissive policies (using true)',
          'Tables reachable via the anon role',
          'Weak auth & open sign-up settings',
        ],
        note: 'The service-role key is highly sensitive. It is encrypted at rest, used read-only, and never exposed to the client.',
      },
      {
        name: 'Neon',
        icon: <Database className="size-4" />,
        connected: false,
        credential: 'Read-only connection string',
        scope: 'Read: schema, roles, grants',
        analyzes: [
          'Public schema grants & role privileges',
          'Missing SSL enforcement',
          'Tables without access controls',
        ],
        note: 'Create a dedicated read-only role rather than sharing the owner connection string.',
      },
      {
        name: 'PostgreSQL',
        icon: <Database className="size-4" />,
        connected: true,
        detail: 'orders-db · monitoring',
        credential: 'Read-only database user',
        scope: 'SELECT on system catalogs',
        analyzes: [
          'Role & privilege misconfigurations',
          'Missing encryption in transit',
          'Exposed or default credentials',
        ],
        note: 'Grant only pg_monitor / read access — Riscly never modifies data or schema.',
      },
    ],
  },
  {
    category: 'Cache, queue & payments',
    items: [
      {
        name: 'Upstash Redis',
        icon: <Database className="size-4" />,
        connected: false,
        credential: 'REST URL + read-only token',
        scope: 'Read: config & connection info',
        analyzes: [
          'TLS disabled or public endpoints',
          'Missing auth / default passwords',
          'Eviction & persistence misconfig',
        ],
        note: 'Provide a read-only token. Riscly never reads or stores cached payloads.',
      },
      {
        name: 'Stripe',
        icon: <CreditCard className="size-4" />,
        connected: false,
        credential: 'Restricted API key (read-only)',
        scope: 'Read: webhooks, API version, config',
        analyzes: [
          'Unverified or insecure webhook endpoints',
          'Outdated API versions',
          'Keys exposed in client-side code',
        ],
        note: 'Use a restricted key with read permissions only — never your live secret key.',
      },
    ],
  },
  {
    category: 'Observability',
    items: [
      {
        name: 'Datadog',
        icon: <Cloud className="size-4" />,
        connected: false,
        credential: 'API key + application key',
        scope: 'Read: services, monitors, telemetry',
        analyzes: [
          'Runtime reachability of risks (in production)',
          'Service dependency map enrichment',
          'Exposure & traffic context',
        ],
        note: 'Application key should belong to a read-only service account.',
      },
      {
        name: 'Sentry',
        icon: <Bell className="size-4" />,
        connected: false,
        credential: 'Internal integration token',
        scope: 'Read: projects, issues, releases',
        analyzes: [
          'Errors correlated to known risks',
          'Releases shipping unresolved vulnerabilities',
        ],
        note: 'Scope the token to specific projects rather than the whole organization.',
      },
    ],
  },
]

export function SettingsView() {
  const [active, setActive] = useState<Section>('account')

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Settings"
        subtitle="Configure data sources, scanning depth and AI remediation"
      />
      <div className="flex min-h-0 flex-1">
        {/* sub nav */}
        <nav className="w-56 shrink-0 border-r border-border bg-panel/40 p-3">
          <div className="flex flex-col gap-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                  active === s.id
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-3xl">
            {active === 'account' && <AccountPanel />}
            {active === 'repositories' && <RepositoriesPanel />}
            {active === 'billing' && <BillingPanel />}
            {active === 'integrations' && <IntegrationsPanel />}
            {active === 'scanning' && <ScanningPanel />}
            {active === 'ai' && <AiPanel />}
            {active === 'notifications' && <NotificationsPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}

/** After GitHub authorization for a new project, choose the repo to scan. */
function PickRepoCard({
  projectId,
  onDone,
}: {
  projectId: string
  onDone: (id: string) => void
}) {
  const token = useAuth((s) => s.token)
  const conns = useQuery({
    queryKey: ['connections', projectId],
    queryFn: () => api.listConnections(projectId),
    enabled: Boolean(token && projectId),
  })
  const gh = conns.data?.find((c) => c.provider === 'github')
  const repos = (gh?.metadata?.repos as string[] | undefined) ?? []
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const repo = selected || repos[0] || ''

  const [done, setDone] = useState(false)

  async function add() {
    if (!gh || !repo) return
    setBusy(true)
    setError(null)
    try {
      const repoName = repo.split('/').pop() || repo
      await api.updateConnection(projectId, gh.id, { selectedRepos: [repo] })
      await api.renameProject(projectId, repoName)
      // Kick off the scan but don't block the UI on it — it can take a while.
      void api.startScan(projectId).catch(() => {})
      // Mark done so the button never spins indefinitely, then hand off to the
      // parent (which switches to the new repo and clears the URL).
      setDone(true)
      onDone(projectId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Add repository"
        icon={<GitBranch className="size-3.5 text-primary" />}
      />
      <div className="space-y-3 p-3">
        {conns.isLoading ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading repositories…
          </p>
        ) : repos.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No repositories were granted from that account. Re-authorize and grant
            access to the repository you want to add.
          </p>
        ) : (
          <>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Repository to add
              </span>
              <select
                value={repo}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-primary/50"
              >
                {repos.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={add}
              disabled={busy || done}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : done ? (
                <Check className="size-3.5" />
              ) : null}
              {busy ? 'Adding…' : done ? 'Added' : 'Add & scan'}
            </button>
          </>
        )}
        {error && <p className="text-[11px] text-destructive">{error}</p>}
      </div>
    </Panel>
  )
}

function RepositoriesPanel() {
  const router = useRouter()
  const qc = useQueryClient()
  const token = useAuth((s) => s.token)
  const projects = useProjects()
  const { project } = useActiveProject()
  const setActiveProject = useActiveProjectStore((s) => s.setActiveProject)

  const me = useQuery({ queryKey: ['me'], queryFn: api.me, enabled: Boolean(token) })
  const plan = (me.data?.activeOrg.plan as Plan | undefined) ?? 'starter'
  const max = PLAN_LIMITS[plan]?.maxProjects ?? 1
  const maxLabel = Number.isFinite(max) ? String(max) : 'Unlimited'
  const list = projects.data ?? []
  const atLimit = Number.isFinite(max) && list.length >= max

  // Returned from GitHub authorization for a just-created project → pick which
  // repo to scan, then it's added (no onboarding wizard).
  const search =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()
  const pendingProject =
    search.get('connected') === 'github' ? search.get('project') : null

  return (
    <div className="flex flex-col gap-4">
      {pendingProject && (
        <PickRepoCard
          projectId={pendingProject}
          onDone={(id) => {
            setActiveProject(id)
            qc.invalidateQueries({ queryKey: ['projects'] })
            qc.invalidateQueries({ queryKey: ['onboarding-state'] })
            router.replace('/settings')
          }}
        />
      )}
      <Panel>
        <PanelHeader
          title="Connected repositories"
          icon={<GitBranch className="size-3.5 text-primary" />}
          action={
            <span className="font-mono text-[11px] text-muted-foreground">
              {list.length} / {maxLabel}
            </span>
          }
        />
        {list.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {projects.isLoading ? 'Loading…' : 'No repositories connected yet.'}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {list.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <GitBranch className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {p.environment ?? 'production'}
                  </p>
                </div>
                {project?.id === p.id ? (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                    Active
                  </span>
                ) : (
                  <button
                    onClick={() => setActiveProject(p.id)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    Switch to
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <AddRepositorySection
          atLimit={atLimit}
          plan={plan}
          maxLabel={maxLabel}
        />
      </Panel>

      <div className="flex items-start gap-2.5 rounded-md border border-border bg-panel px-3 py-2.5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Each repository is its own project with its own scans and findings.
          Repos you already authorized can be added instantly below; to add one
          from a different account or grant access to a new repo, re-authorize
          GitHub.
        </p>
      </div>
    </div>
  )
}

/**
 * Persistent add-repository control inside the repositories panel. When the user
 * has already authorized GitHub, it lists the granted repos that aren't added
 * yet and adds the chosen one instantly (cloning the stored authorization — no
 * redirect). It always also offers re-authorization to grant new repos/accounts.
 */
function AddRepositorySection({
  atLimit,
  plan,
  maxLabel,
}: {
  atLimit: boolean
  plan: Plan
  maxLabel: string
}) {
  const { sourceProjectId, available, hasAuth, loading } = useAddableRepos()
  const grant = useAddRepoFromGrant()
  const reauth = useAddRepository()
  const [selected, setSelected] = useState('')
  const repo = selected || available[0] || ''

  return (
    <div className="space-y-3 border-t border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">Add a repository</p>

      {atLimit ? (
        <p className="text-[11px] text-muted-foreground">
          Your {plan} plan allows {maxLabel} repositories. Upgrade to connect
          more.
        </p>
      ) : (
        <>
          {hasAuth && available.length > 0 && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1 space-y-1.5">
                <span className="text-[11px] text-muted-foreground">
                  From your authorized GitHub repositories
                </span>
                <select
                  value={repo}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-primary/50"
                >
                  {available.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => sourceProjectId && grant.add(sourceProjectId, repo)}
                disabled={!sourceProjectId || !repo || grant.busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {grant.busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Add
              </button>
            </div>
          )}

          {hasAuth && available.length === 0 && !loading && (
            <p className="text-[11px] text-muted-foreground">
              Every authorized repository is already added. Re-authorize GitHub
              to grant access to more.
            </p>
          )}

          <button
            onClick={reauth.start}
            disabled={reauth.busy}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50',
              hasAuth && available.length > 0
                ? 'border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {reauth.busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <GitBranch className="size-3.5" />
            )}
            {hasAuth ? 'Authorize more repositories' : 'Connect GitHub'}
          </button>

          {grant.error && (
            <p className="text-[11px] text-destructive">{grant.error}</p>
          )}
          {reauth.error && (
            <p className="text-[11px] text-destructive">{reauth.error}</p>
          )}
        </>
      )}
    </div>
  )
}

function ChangePasswordPanel() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    setError(null)
    try {
      await updatePassword(password)
      setSaved(true)
      setPassword('')
      setConfirm('')
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel>
      <PanelHeader title="Password" icon={<KeyRound className="size-3.5 text-primary" />} />
      <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          autoComplete="new-password"
          className="rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-primary/50"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          autoComplete="new-password"
          className="rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-primary/50"
        />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
        <span className="text-[11px] text-muted-foreground">
          {error ? <span className="text-destructive">{error}</span> : 'Changes your sign-in password.'}
        </span>
        <button
          onClick={save}
          disabled={busy || !password}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : saved ? <Check className="size-3.5" /> : null}
          {saved ? 'Saved' : 'Update password'}
        </button>
      </div>
    </Panel>
  )
}

function SupportPanel() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSend = subject.trim().length >= 3 && message.trim().length >= 10 && !busy

  async function send() {
    if (!canSend) return
    setBusy(true)
    setError(null)
    try {
      await api.support(subject.trim(), message.trim())
      setSent(true)
      setSubject('')
      setMessage('')
      setTimeout(() => setSent(false), 4000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel>
      <PanelHeader title="Contact support" icon={<Mail className="size-3.5 text-primary" />} />
      <div className="space-y-2.5 p-3">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-primary/50"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          rows={4}
          className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-primary/50"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Replies go to your account email.
          </p>
          <button
            onClick={send}
            disabled={!canSend}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : sent ? (
              <Check className="size-3.5" />
            ) : (
              <Mail className="size-3.5" />
            )}
            {sent ? 'Sent' : 'Send message'}
          </button>
        </div>
        {error && <p className="text-[11px] text-destructive">{error}</p>}
      </div>
    </Panel>
  )
}

function initialsOf(nameOrEmail: string): string {
  const parts = nameOrEmail.trim().split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase()
}

function AccountPanel() {
  const router = useRouter()
  const qc = useQueryClient()
  const { token, user, signOut, updateUser } = useAuth()

  const me = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    enabled: Boolean(token),
  })

  const email = me.data?.user.email ?? user?.email ?? ''
  const serverName = me.data?.user.name ?? user?.name ?? ''
  const orgName = me.data?.activeOrg.name ?? ''

  const [name, setName] = useState<string | null>(null)
  const value = name ?? serverName
  const dirty = name !== null && name.trim() !== serverName
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function saveName() {
    if (!dirty || saving) return
    setSaving(true)
    setSaved(false)
    try {
      const updated = await api.updateProfile(value.trim())
      updateUser({ name: updated.name })
      qc.invalidateQueries({ queryKey: ['me'] })
      setName(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      /* surfaced inline by leaving the field dirty */
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader title="Profile" icon={<UserRound className="size-3.5 text-primary" />} />
        <div className="flex items-center gap-4 px-3 py-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
            {initialsOf(serverName || email || '?')}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{serverName || email || 'Your account'}</p>
            <p className="truncate text-xs text-muted-foreground">
              {orgName ? `${orgName} workspace` : 'Riscly workspace'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 px-3 pb-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Full name</span>
            <input
              value={value}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none transition-colors focus:border-primary/50"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <input
              type="email"
              value={email}
              readOnly
              className="rounded-md border border-border bg-secondary px-2.5 py-2 text-sm text-muted-foreground outline-none"
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
          <button
            onClick={() => {
              signOut()
              router.replace('/login')
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
          <button
            onClick={saveName}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : saved ? (
              <Check className="size-3.5" />
            ) : null}
            {saved ? 'Saved' : 'Save changes'}
          </button>
        </div>
      </Panel>

      <ChangePasswordPanel />

      <SupportPanel />

      <Panel>
        <PanelHeader title="Danger zone" icon={<UserRound className="size-3.5 text-critical" />} />
        <SettingRow
          title="Delete account"
          desc="Permanently remove your account and data"
          control={
            <button className="rounded-md border border-critical/40 bg-critical/10 px-2.5 py-1 text-xs font-medium text-critical hover:bg-critical/20">
              Delete
            </button>
          }
        />
      </Panel>
    </div>
  )
}

function BillingPanel() {
  const router = useRouter()
  const token = useAuth((s) => s.token)
  const me = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    enabled: Boolean(token),
  })
  const details = useQuery({
    queryKey: ['billing-details'],
    queryFn: api.billingDetails,
    enabled: Boolean(token),
  })
  const planLabel = me.data?.activeOrg.plan ?? me.data?.subscription.plan ?? 'Team'
  const active = me.data?.subscription.active ?? true
  const status = me.data?.subscription.status
  const invoices = details.data?.invoices ?? []
  const card = details.data?.paymentMethod ?? null
  const billingEmail = me.data?.user.email ?? ''

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader title="Current plan" icon={<CreditCard className="size-3.5 text-primary" />} />
        <div className="flex items-start justify-between gap-4 px-3 py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold capitalize">{planLabel}</p>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'bg-high/15 text-high',
                )}
              >
                {active ? 'Active' : status ?? 'Inactive'}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {active
                ? 'Subscription active · billed monthly'
                : 'No active subscription'}
            </p>
          </div>
          <button
            onClick={() => router.push('/billing')}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {active ? 'Change plan' : 'Choose plan'} <ArrowUpRight className="size-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
          {[
            { label: 'Repositories', value: '14 / 25' },
            { label: 'Seats', value: '8 / 15' },
            { label: 'Scans this month', value: '1,284' },
          ].map((s) => (
            <div key={s.label} className="px-3 py-3">
              <p className="font-mono text-lg font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Payment method" icon={<CreditCard className="size-3.5 text-primary" />} />
        <SettingRow
          title={
            card
              ? `${card.brand[0].toUpperCase()}${card.brand.slice(1)} ending in ${card.last4}`
              : 'No card on file'
          }
          desc={
            card
              ? `Expires ${String(card.expMonth).padStart(2, '0')} / ${card.expYear}`
              : 'Add a card from the billing portal'
          }
          control={
            <button
              onClick={() => router.push('/billing')}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {card ? 'Update' : 'Add'}
            </button>
          }
        />
        <SettingRow
          title="Billing email"
          desc={billingEmail || '—'}
          control={
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Mail className="size-3.5" /> Account email
            </span>
          }
        />
      </Panel>

      <Panel>
        <PanelHeader title="Invoices" icon={<Download className="size-3.5 text-primary" />} />
        {invoices.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {details.isLoading ? 'Loading invoices…' : 'No invoices yet.'}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-medium">
                    {inv.number ?? inv.id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(inv.date).toLocaleDateString()}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-low/30 bg-low/10 px-2 py-0.5 text-[11px] font-medium text-low capitalize">
                  <Check className="size-3" /> {inv.status}
                </span>
                <span className="w-20 text-right font-mono text-xs">{inv.amount}</span>
                {inv.url ? (
                  <a
                    href={inv.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Download invoice"
                  >
                    <Download className="size-4" />
                  </a>
                ) : (
                  <span className="w-4" />
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

// Catalog name → backend connection provider slug. Entries not listed here have
// no backend provider yet and keep their static (design-only) connect button.
const NAME_TO_PROVIDER: Record<string, string> = {
  GitHub: 'github',
  GitLab: 'gitlab',
  Vercel: 'vercel',
  Render: 'render',
  AWS: 'aws',
  Supabase: 'supabase',
  Neon: 'neon',
  Stripe: 'stripe',
}
// Providers connected via an OAuth redirect rather than a pasted token.
const OAUTH_PROVIDERS = new Set(['github'])

function IntegrationsPanel() {
  const { projectId } = useActiveProject()
  const token = useAuth((s) => s.token)
  const qc = useQueryClient()

  const connections = useQuery({
    queryKey: ['connections', projectId],
    queryFn: () => api.listConnections(projectId!),
    enabled: Boolean(token && projectId),
  })
  const connectedProviders = new Set(
    (connections.data ?? []).map((c) => c.provider),
  )
  const refresh = () =>
    qc.invalidateQueries({ queryKey: ['connections', projectId] })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 rounded-md border border-border bg-panel px-3 py-2.5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Connect a source for <span className="text-foreground">verified</span> findings.
          GitHub alone lets Riscly <span className="text-foreground">estimate</span> your
          architecture from code; connecting a service confirms its real configuration and
          surfaces risks that source code cannot reveal. All credentials are encrypted at rest,
          used read-only, and scoped to least privilege.
        </p>
      </div>

      {!projectId && (
        <div className="flex items-start gap-2.5 rounded-md border border-medium/30 bg-medium/10 px-3 py-2.5">
          <Plug className="mt-0.5 size-4 shrink-0 text-medium" />
          <p className="text-xs leading-relaxed text-foreground">
            Create a project first to connect integrations — finish onboarding to
            set one up.
          </p>
        </div>
      )}

      {integrationCatalog.map((group) => (
        <Panel key={group.category}>
          <PanelHeader title={group.category} icon={<Plug className="size-3.5 text-primary" />} />
          <div className="divide-y divide-border">
            {group.items.map((i) => {
              const provider = NAME_TO_PROVIDER[i.name] ?? null
              const conn = provider
                ? (connections.data ?? []).find((c) => c.provider === provider)
                : undefined
              // Real status overrides the static flag for backed providers.
              const isConnected = provider ? Boolean(conn) : i.connected
              return (
                <IntegrationCard
                  key={i.name}
                  integration={i}
                  provider={provider}
                  isConnected={isConnected}
                  connectionId={conn?.id}
                  projectId={projectId}
                  onChanged={refresh}
                />
              )
            })}
          </div>
        </Panel>
      ))}
    </div>
  )
}

function IntegrationCard({
  integration: i,
  provider,
  isConnected,
  connectionId,
  projectId,
  onChanged,
}: {
  integration: Integration
  provider: string | null
  isConnected: boolean
  connectionId?: string
  projectId: string | null
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [anonInput, setAnonInput] = useState('')
  const [reposInput, setReposInput] = useState('')
  const [awsKeyInput, setAwsKeyInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function disconnect() {
    if (!projectId || !connectionId || disconnecting) return
    setDisconnecting(true)
    setError(null)
    try {
      await api.deleteConnection(projectId, connectionId)
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDisconnecting(false)
    }
  }

  const canConnect = Boolean(provider && projectId && !isConnected)
  const isOAuth = provider ? OAUTH_PROVIDERS.has(provider) : false
  // Supabase verified posture needs the project URL (+ optional anon key) so the
  // collector can read auth settings and probe RLS.
  const isSupabase = provider === 'supabase'
  // GitLab is a token (PAT) connection that scans the listed project paths.
  const isGitlab = provider === 'gitlab'
  // AWS needs an access key id + region (metadata) and the secret key (token).
  const isAws = provider === 'aws'
  // Vercel org tokens see every project — let the user scope to specific ones.
  const isVercel = provider === 'vercel'

  async function connect() {
    if (!provider || !projectId) return
    setBusy(true)
    setError(null)
    try {
      if (isOAuth) {
        const { url } = await api.oauthAuthorizeUrl(provider, projectId, '/settings')
        window.location.href = url
        return
      }
      let metadata: Record<string, unknown> | undefined
      if (isSupabase && (urlInput || anonInput)) {
        metadata = { url: urlInput || undefined, anonKey: anonInput || undefined }
      } else if (isGitlab) {
        const repos = reposInput
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean)
        metadata = {
          ...(repos.length ? { repos, selectedRepos: repos } : {}),
          ...(urlInput ? { baseUrl: urlInput } : {}),
        }
      } else if (isAws && (awsKeyInput || urlInput)) {
        metadata = {
          ...(awsKeyInput ? { accessKeyId: awsKeyInput } : {}),
          ...(urlInput ? { region: urlInput } : {}),
        }
      } else if (isVercel && reposInput) {
        const selectedProjects = reposInput
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
        if (selectedProjects.length) metadata = { selectedProjects }
      }
      await api.createConnection(projectId, {
        provider,
        token: tokenInput || undefined,
        ...(metadata ? { metadata } : {}),
      })
      setTokenInput('')
      setUrlInput('')
      setAnonInput('')
      setReposInput('')
      setAwsKeyInput('')
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/50"
        aria-expanded={open}
      >
        <div className="flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
          {i.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{i.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {isConnected && i.detail ? i.detail : i.credential}
          </p>
        </div>
        {isConnected ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-low/30 bg-low/10 px-2 py-0.5 text-[11px] font-medium text-low">
            <Check className="size-3" /> Connected
          </span>
        ) : (
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Not connected
          </span>
        )}
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t border-border/60 bg-background/40 px-3 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <KeyRound className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Credential
                </p>
                <p className="text-xs text-foreground">{i.credential}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Minimum scope
                </p>
                <p className="text-xs text-foreground">{i.scope}</p>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            What Riscly analyzes
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {i.analyzes.map((a) => (
              <li key={a} className="flex items-start gap-2 text-xs text-foreground">
                <Check className="mt-0.5 size-3 shrink-0 text-low" />
                {a}
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-start gap-2 rounded-md border border-medium/30 bg-medium/10 px-2.5 py-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-medium" />
            <p className="text-[11px] leading-relaxed text-foreground">{i.note}</p>
          </div>

          {isConnected && connectionId && projectId && (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={disconnect}
                disabled={disconnecting}
                className="inline-flex items-center gap-1.5 rounded-md border border-critical/40 bg-critical/10 px-3 py-1.5 text-xs font-medium text-critical hover:bg-critical/20 disabled:opacity-50"
              >
                {disconnecting ? <Loader2 className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />}
                Disconnect
              </button>
              <span className="text-[11px] text-muted-foreground">
                Removes the stored credential; findings from this source are dropped on the next scan.
              </span>
              {error && <span className="text-[11px] text-destructive">{error}</span>}
            </div>
          )}

          {!isConnected && (
            <div className="mt-3">
              {isSupabase && projectId && (
                <>
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Project URL — https://xxxx.supabase.co"
                    className="mb-2 w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs outline-none focus:border-primary/50"
                  />
                  <input
                    value={anonInput}
                    onChange={(e) => setAnonInput(e.target.value)}
                    placeholder="anon public key (enables RLS checks)"
                    className="mb-2 w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs outline-none focus:border-primary/50"
                  />
                </>
              )}
              {isGitlab && projectId && (
                <>
                  <input
                    value={reposInput}
                    onChange={(e) => setReposInput(e.target.value)}
                    placeholder="Projects — group/app, group/api (comma-separated)"
                    className="mb-2 w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs outline-none focus:border-primary/50"
                  />
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Self-hosted URL (optional) — https://gitlab.example.com"
                    className="mb-2 w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs outline-none focus:border-primary/50"
                  />
                </>
              )}
              {isVercel && projectId && (
                <input
                  value={reposInput}
                  onChange={(e) => setReposInput(e.target.value)}
                  placeholder="Projects to include (optional) — my-app, my-api"
                  className="mb-2 w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs outline-none focus:border-primary/50"
                />
              )}
              {isAws && projectId && (
                <>
                  <input
                    value={awsKeyInput}
                    onChange={(e) => setAwsKeyInput(e.target.value)}
                    placeholder="Access key ID — AKIA…"
                    className="mb-2 w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs outline-none focus:border-primary/50"
                  />
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Region — us-east-1"
                    className="mb-2 w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs outline-none focus:border-primary/50"
                  />
                </>
              )}
              {provider && !isOAuth && projectId && (
                <input
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={
                    isSupabase
                      ? 'Service-role key (optional — for auth settings)'
                      : isGitlab
                        ? 'Project access token (read_api, read_repository)'
                        : isAws
                          ? 'Secret access key'
                          : `${i.name} API token`
                  }
                  className="mb-2 w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs outline-none focus:border-primary/50"
                />
              )}
              <button
                onClick={connect}
                disabled={!canConnect || busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                title={
                  !provider
                    ? 'No backend provider yet'
                    : !projectId
                      ? 'Create a project first'
                      : undefined
                }
              >
                {busy && <Loader2 className="size-3.5 animate-spin" />}
                {isOAuth ? `Connect ${i.name}` : `Connect ${i.name}`}
              </button>
              {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Toggle({ on }: { on: boolean }) {
  const [enabled, setEnabled] = useState(on)
  return (
    <button
      onClick={() => setEnabled((v) => !v)}
      className={cn(
        'inline-flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors',
        enabled ? 'bg-primary' : 'bg-secondary',
      )}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={cn(
          'size-4 rounded-full bg-foreground shadow-sm transition-transform duration-200',
          enabled ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

function SettingRow({
  title,
  desc,
  control,
}: {
  title: string
  desc: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {control}
    </div>
  )
}

function ScanningPanel() {
  return (
    <Panel>
      <PanelHeader title="Scanning configuration" icon={<ShieldCheck className="size-3.5 text-primary" />} />
      <div className="divide-y divide-border">
        <SettingRow title="Static analysis (SAST)" desc="Scan source on every push" control={<Toggle on />} />
        <SettingRow title="Dependency scanning (SCA)" desc="Detect vulnerable libraries" control={<Toggle on />} />
        <SettingRow title="Infrastructure as Code" desc="Scan Terraform & K8s manifests" control={<Toggle on />} />
        <SettingRow title="Secret scanning" desc="Detect committed credentials" control={<Toggle on />} />
        <SettingRow title="Runtime reachability" desc="Only flag risks reachable in production" control={<Toggle on />} />
      </div>
    </Panel>
  )
}

function AiPanel() {
  return (
    <Panel>
      <PanelHeader title="AI & remediation" icon={<Bot className="size-3.5 text-primary" />} />
      <div className="divide-y divide-border">
        <SettingRow title="Suggested fixes" desc="Generate AI fixes for new risks" control={<Toggle on />} />
        <SettingRow title="Auto-open PRs" desc="Open a draft PR when a fix is accepted" control={<Toggle on={false} />} />
        <SettingRow title="Simulation before merge" desc="Run impact simulation on every fix" control={<Toggle on />} />
        <div className="px-3 py-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="size-3.5 text-muted-foreground" />
            Risk model
          </div>
          <select className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-primary/50">
            <option>Balanced — security + reliability + performance</option>
            <option>Security first</option>
            <option>Reliability first</option>
          </select>
        </div>
      </div>
    </Panel>
  )
}

function NotificationsPanel() {
  return (
    <Panel>
      <PanelHeader title="Notifications" icon={<Bell className="size-3.5 text-primary" />} />
      <div className="divide-y divide-border">
        <SettingRow title="Critical risks" desc="Notify immediately via Slack & email" control={<Toggle on />} />
        <SettingRow title="New high risks" desc="Daily digest" control={<Toggle on />} />
        <SettingRow title="Simulation results" desc="When a scenario finishes" control={<Toggle on={false} />} />
        <SettingRow title="Weekly posture report" desc="Summary every Monday 9am" control={<Toggle on />} />
      </div>
    </Panel>
  )
}
