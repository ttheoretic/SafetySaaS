/**
 * Change Intelligence Engine.
 *
 * Answers one question for every commit: *is this change safe for the
 * architecture we already know about?*
 *
 * The engine is pure and deterministic — it reads the commit metadata the
 * GitHub collector provides (message, touched paths, patch hunks) and the
 * current `SystemGraph`, and emits signals explaining what the change means
 * for security, architecture, reliability, dependencies and the business.
 * No I/O, no AI: the AI layer can summarise on top, but the verdict itself is
 * reproducible and explainable.
 */

import { Severity } from './findings';
import { SystemGraph, SystemNode } from './model';

/** One file touched by a commit, as reported by the code host. */
export interface ChangedFile {
  path: string;
  status?: 'added' | 'modified' | 'removed' | 'renamed';
  additions?: number;
  deletions?: number;
  /** Unified diff hunk, when the host returns one (used for dependency and
   *  destructive-migration detection). Absent for large or binary files. */
  patch?: string;
}

/** A commit plus the files it touched — the engine's input. */
export interface ChangeInput {
  sha: string;
  message: string;
  author: string;
  repo: string;
  /** ISO timestamp. */
  date: string;
  url?: string;
  files: ChangedFile[];
}

/** Which dimension of the risk model a signal belongs to. */
export type ChangeImpactKind =
  | 'security'
  | 'architecture'
  | 'reliability'
  | 'dependency'
  | 'business';

/** One reason this change carries risk, with the evidence that produced it. */
export interface ChangeSignal {
  kind: ChangeImpactKind;
  severity: Severity;
  /** Short label, e.g. "Authentication logic changed". */
  title: string;
  /** Why it matters for this system. */
  detail: string;
  /** Repo-relative paths that triggered the signal (evidence). */
  files: string[];
  /** Points contributed to the change-risk score. */
  weight: number;
}

export type ChangeRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ChangeAnalysis {
  sha: string;
  message: string;
  author: string;
  repo: string;
  date: string;
  url?: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  /** 0..100 — how risky this change is for the known architecture. */
  score: number;
  risk: ChangeRisk;
  /** One plain-English sentence a non-expert can act on. */
  summary: string;
  signals: ChangeSignal[];
  /** Graph node ids this change plausibly affects. */
  touchedNodes: string[];
  /** Package names added by this commit (from manifest/lockfile hunks). */
  newDependencies: string[];
}

/** A path rule: which files matter, and what it means when they change. */
interface PathRule {
  id: string;
  kind: ChangeImpactKind;
  severity: Severity;
  weight: number;
  title: string;
  detail: string;
  match: (path: string) => boolean;
  /** Which graph nodes this rule implicates. */
  nodes?: (graph: SystemGraph) => SystemNode[];
}

const has = (p: string, ...needles: string[]) =>
  needles.some((n) => p.includes(n));

const nodesOfKind = (graph: SystemGraph, ...kinds: SystemNode['kind'][]) =>
  graph.nodes.filter((n) => kinds.includes(n.kind));

const PATH_RULES: PathRule[] = [
  {
    id: 'auth',
    kind: 'security',
    severity: 'high',
    weight: 26,
    title: 'Authentication or session logic changed',
    detail:
      'Changes here can silently open protected routes or break session handling. Verify the auth tests and check that no route lost its guard.',
    match: (p) =>
      has(p, '/auth/', 'auth.', 'session', 'jwt', 'passport', 'login', 'permission', 'guard', 'rbac'),
    nodes: (g) => nodesOfKind(g, 'api', 'service').filter((n) => n.hasAuth !== false),
  },
  {
    id: 'secrets',
    kind: 'security',
    severity: 'critical',
    weight: 46,
    title: 'Secret or credential file touched',
    detail:
      'Environment and credential files are the most common source of leaked keys. Confirm nothing real was committed and rotate anything that was.',
    // Template files (.env.example and friends) are meant to be committed.
    match: (p) =>
      !has(p, '.example', '.sample', '.template', '.dist') &&
      has(p, '.env', 'credential', 'secret', '.pem', '.p12', 'id_rsa', 'serviceaccount'),
  },
  {
    id: 'infra',
    kind: 'architecture',
    severity: 'high',
    weight: 22,
    title: 'Infrastructure definition changed',
    detail:
      'The deployed topology may differ from the architecture Riscly mapped. Re-scan after deploying so the model stays accurate.',
    match: (p) =>
      has(p, 'dockerfile', 'docker-compose', '.tf', 'terraform', 'k8s/', 'kubernetes/', 'helm/', 'serverless.', 'vercel.json', 'render.yaml', 'fly.toml', 'nginx'),
  },
  {
    id: 'ci',
    kind: 'reliability',
    severity: 'medium',
    weight: 12,
    title: 'Build or deployment pipeline changed',
    detail:
      'A broken pipeline blocks your ability to ship a fix. Confirm the workflow still runs tests before deploying.',
    match: (p) => has(p, '.github/workflows/', '.gitlab-ci', 'buildspec', 'cloudbuild', 'jenkinsfile'),
  },
  {
    id: 'schema',
    kind: 'reliability',
    severity: 'high',
    weight: 24,
    title: 'Database schema or migration changed',
    detail:
      'Schema changes are hard to roll back. Check that the migration is backwards compatible with the currently deployed code and that a backup exists.',
    match: (p) => has(p, 'migration', 'schema.prisma', '.sql', 'alembic/', 'knexfile'),
    nodes: (g) => nodesOfKind(g, 'database'),
  },
  {
    id: 'payments',
    kind: 'business',
    severity: 'high',
    weight: 22,
    title: 'Revenue path changed',
    detail:
      'This code sits on the checkout/billing path — a regression here costs money directly, not just uptime.',
    match: (p) => has(p, 'stripe', 'checkout', 'billing', 'payment', 'subscription', 'invoice'),
    nodes: (g) =>
      g.nodes.filter((n) => n.provider === 'stripe' || has(n.name.toLowerCase(), 'payment', 'checkout', 'billing')),
  },
  {
    id: 'api',
    kind: 'architecture',
    severity: 'medium',
    weight: 12,
    title: 'API surface changed',
    detail:
      'Request handling changed. Clients depending on these endpoints may break, and new endpoints need the same rate limiting and auth as the rest.',
    match: (p) => has(p, '/api/', 'route.ts', 'route.js', 'controller', 'handler', 'resolver'),
    nodes: (g) => nodesOfKind(g, 'api'),
  },
  {
    id: 'data-access',
    kind: 'reliability',
    severity: 'medium',
    weight: 10,
    title: 'Data access layer changed',
    detail:
      'Query and caching code drives database load. Watch for new N+1 queries or dropped cache reads after this deploys.',
    match: (p) => has(p, 'repository', 'prisma', 'query', 'cache', 'redis', 'queue', 'worker'),
    nodes: (g) => nodesOfKind(g, 'database', 'cache', 'queue'),
  },
  {
    id: 'config',
    kind: 'architecture',
    severity: 'medium',
    weight: 10,
    title: 'Runtime configuration changed',
    detail:
      'Configuration drives behaviour in production without a code review of the effect. Confirm the values are correct for every environment.',
    match: (p) => has(p, 'config', 'settings.', 'next.config', 'middleware.'),
  },
];

/** Manifest and lockfile names that indicate a dependency change. */
const MANIFESTS = [
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'requirements.txt',
  'pyproject.toml',
  'poetry.lock',
  'go.mod',
  'gemfile',
  'cargo.toml',
  'composer.json',
];

function isManifest(path: string): boolean {
  const base = path.split('/').pop()?.toLowerCase() ?? '';
  return MANIFESTS.includes(base);
}

/**
 * Package names added by a commit, read from the added lines of manifest
 * hunks. Best-effort: covers npm/JSON manifests, requirements.txt and go.mod.
 */
export function addedDependencies(files: ChangedFile[]): string[] {
  const out = new Set<string>();
  for (const f of files) {
    if (!f.patch || !isManifest(f.path)) continue;
    for (const raw of f.patch.split('\n')) {
      if (!raw.startsWith('+') || raw.startsWith('+++')) continue;
      const line = raw.slice(1).trim();
      // JSON manifests:  "redis": "^4.6.0"
      const json = line.match(/^"([@a-z0-9._/-]+)"\s*:\s*"[^"]*"/i);
      if (json) {
        out.add(json[1]);
        continue;
      }
      // requirements.txt: redis==4.6.0   |   go.mod: github.com/redis/go-redis v9
      const plain = line.match(/^([a-z0-9._/-]+)\s*(?:[=><~^]{1,2}|\sv?\d)/i);
      if (plain && !line.startsWith('#')) out.add(plain[1]);
    }
  }
  // Manifest metadata keys are not dependencies.
  const noise = new Set(['name', 'version', 'description', 'license', 'main', 'module', 'types', 'private', 'scripts']);
  return [...out].filter((n) => !noise.has(n)).slice(0, 12);
}

/** Whether a migration hunk contains an irreversible statement. */
function hasDestructiveMigration(files: ChangedFile[]): string[] {
  const hits: string[] = [];
  for (const f of files) {
    if (!f.patch) continue;
    const added = f.patch
      .split('\n')
      .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
      .join('\n')
      .toLowerCase();
    if (/drop\s+(table|column|database)|truncate\s+table|delete\s+from/.test(added)) {
      hits.push(f.path);
    }
  }
  return hits;
}

/** Conventional-commit / message hints that raise or lower attention. */
function messageSignal(message: string): ChangeSignal | null {
  const m = message.toLowerCase();
  if (/\b(revert|rollback)\b/.test(m)) {
    return {
      kind: 'reliability',
      severity: 'medium',
      title: 'Revert commit',
      detail:
        'A revert usually follows an incident. Confirm the original problem is understood, not just undone.',
      files: [],
      weight: 8,
    };
  }
  if (/\b(hotfix|emergency|urgent|asap)\b/.test(m)) {
    return {
      kind: 'reliability',
      severity: 'medium',
      title: 'Hotfix shipped outside the normal flow',
      detail:
        'Hotfixes skip the usual review depth. Worth a follow-up look once the pressure is off.',
      files: [],
      weight: 10,
    };
  }
  return null;
}

const RISK_BANDS: { min: number; risk: ChangeRisk }[] = [
  { min: 70, risk: 'critical' },
  { min: 45, risk: 'high' },
  { min: 20, risk: 'medium' },
  { min: 0, risk: 'low' },
];

export function changeRiskFromScore(score: number): ChangeRisk {
  return RISK_BANDS.find((b) => score >= b.min)!.risk;
}

/**
 * Analyse a single commit against the known architecture.
 *
 * `graph` is optional: without a scanned architecture the engine still
 * classifies the change, it just cannot name the affected components.
 */
export function analyzeChange(
  input: ChangeInput,
  graph?: SystemGraph | null,
): ChangeAnalysis {
  const files = input.files ?? [];
  const paths = files.map((f) => f.path.toLowerCase());
  const signals: ChangeSignal[] = [];
  const touched = new Set<string>();

  for (const rule of PATH_RULES) {
    const hit = files.filter((f) => rule.match(f.path.toLowerCase()));
    if (hit.length === 0) continue;
    signals.push({
      kind: rule.kind,
      severity: rule.severity,
      title: rule.title,
      detail: rule.detail,
      files: hit.map((f) => f.path).slice(0, 6),
      weight: rule.weight,
    });
    if (graph && rule.nodes) for (const n of rule.nodes(graph)) touched.add(n.id);
  }

  // Dependencies: a new package is new third-party code and a new failure mode.
  const newDependencies = addedDependencies(files);
  const manifestTouched = files.filter((f) => isManifest(f.path));
  if (manifestTouched.length > 0) {
    signals.push({
      kind: 'dependency',
      severity: newDependencies.length > 0 ? 'medium' : 'low',
      title:
        newDependencies.length > 0
          ? `${newDependencies.length} new ${newDependencies.length === 1 ? 'dependency' : 'dependencies'} added`
          : 'Dependencies updated',
      detail:
        newDependencies.length > 0
          ? `Every new package is code you now ship and a service you now depend on: ${newDependencies.slice(0, 5).join(', ')}. The next scan checks them for known vulnerabilities.`
          : 'Dependency versions moved. The next scan re-checks them against the advisory database.',
      files: manifestTouched.map((f) => f.path).slice(0, 6),
      weight: newDependencies.length > 0 ? 14 : 5,
    });
  }

  // Irreversible data statements deserve their own, louder signal.
  const destructive = hasDestructiveMigration(files);
  if (destructive.length > 0) {
    signals.push({
      kind: 'reliability',
      severity: 'critical',
      title: 'Irreversible data statement in a migration',
      detail:
        'This migration drops or deletes data. Make sure a verified backup exists and that the change is applied in a maintenance window.',
      files: destructive.slice(0, 6),
      weight: 30,
    });
    if (graph) for (const n of nodesOfKind(graph, 'database')) touched.add(n.id);
  }

  const msg = messageSignal(input.message);
  if (msg) signals.push(msg);

  const additions = files.reduce((s, f) => s + (f.additions ?? 0), 0);
  const deletions = files.reduce((s, f) => s + (f.deletions ?? 0), 0);

  // Size is a weak signal on its own, but large diffs are genuinely harder to
  // review — so it nudges rather than drives the score.
  const size = additions + deletions;
  const sizeWeight = size > 1500 ? 12 : size > 600 ? 8 : size > 200 ? 4 : 0;
  if (sizeWeight > 0) {
    signals.push({
      kind: 'reliability',
      severity: sizeWeight >= 12 ? 'medium' : 'low',
      title: `Large change (${size.toLocaleString('en-US')} lines across ${files.length} files)`,
      detail:
        'Large diffs hide regressions because they are hard to review line by line. Consider splitting future changes of this size.',
      files: [],
      weight: sizeWeight,
    });
  }

  // Compound risk: touching auth *and* the revenue path in one commit is worse
  // than either alone, because a mistake now costs money and exposure.
  const kinds = new Set(signals.map((s) => s.kind));
  const compound = kinds.has('security') && kinds.has('business') ? 10 : 0;

  const score = Math.min(
    100,
    Math.round(signals.reduce((s, x) => s + x.weight, 0) + compound),
  );
  const risk = changeRiskFromScore(score);

  signals.sort((a, b) => b.weight - a.weight);

  return {
    sha: input.sha,
    message: input.message,
    author: input.author,
    repo: input.repo,
    date: input.date,
    url: input.url,
    filesChanged: files.length,
    additions,
    deletions,
    score,
    risk,
    summary: summarize(risk, signals, paths.length),
    signals,
    touchedNodes: [...touched],
    newDependencies,
  };
}

function summarize(
  risk: ChangeRisk,
  signals: ChangeSignal[],
  fileCount: number,
): string {
  if (signals.length === 0) {
    return fileCount === 0
      ? 'No file changes were reported for this commit.'
      : 'Routine change — nothing that touches the architecture, security or revenue paths.';
  }
  const lead = signals[0];
  const rest = signals.length - 1;
  const tail = rest > 0 ? ` and ${rest} other ${rest === 1 ? 'signal' : 'signals'}` : '';
  const verdict =
    risk === 'critical'
      ? 'Review before this reaches production.'
      : risk === 'high'
        ? 'Worth a second pair of eyes.'
        : risk === 'medium'
          ? 'Low concern, but keep it in mind for the next release.'
          : 'Safe to ship.';
  return `${lead.title}${tail}. ${verdict}`;
}

/** Analyse a batch of commits, newest first. */
export function analyzeChanges(
  inputs: ChangeInput[],
  graph?: SystemGraph | null,
): ChangeAnalysis[] {
  return inputs
    .map((c) => analyzeChange(c, graph))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** Highest risk band across a set of analysed changes (null when empty). */
export function worstChangeRisk(changes: ChangeAnalysis[]): ChangeRisk | null {
  const order: ChangeRisk[] = ['low', 'medium', 'high', 'critical'];
  let worst = -1;
  for (const c of changes) worst = Math.max(worst, order.indexOf(c.risk));
  return worst < 0 ? null : order[worst];
}
