import type { PreviewKey } from '@/components/features/previews'

export interface Benefit {
  title: string
  desc: string
}
export interface FeatureSection {
  title: string
  body: string
  preview: PreviewKey
  bullets?: string[]
}
export interface FeatureContent {
  category: 'platform' | 'solutions'
  eyebrow: string
  title: string
  lead: string
  hero: PreviewKey
  benefits: Benefit[]
  sections: FeatureSection[]
}

export const FEATURES: Record<string, FeatureContent> = {
  // --- Platform -------------------------------------------------------------
  'architecture-map': {
    category: 'platform',
    eyebrow: 'Platform',
    title: 'Architecture Map',
    lead: 'Connect a repository and Riscly infers your real architecture — every service, datastore, queue and third-party dependency — and wires up the flows between them. One picture of the system nobody fully holds in their head.',
    hero: 'architecture',
    benefits: [
      { title: 'Always up to date', desc: 'The map is re-derived on every scan from your code and connected infrastructure, so it never drifts from reality.' },
      { title: 'No duplicates, nothing dropped', desc: 'Inferred components merge with verified ones from connected collectors — connect a provider and the map stays clean.' },
      { title: 'Risk-weighted', desc: 'Nodes and edges are colored by the severity of what we found, so the riskiest parts of the system jump out.' },
    ],
    sections: [
      {
        title: 'See the whole system at a glance',
        body: 'Frontends, APIs, databases, caches, queues and external APIs are placed on a clean, pannable canvas with the data and control flows between them. Verified nodes from connected providers (GitHub, Vercel, Supabase, AWS) are merged with the components inferred from your code.',
        preview: 'architecture',
        bullets: ['Auto-layout with zoom & pan', 'Verified vs inferred components merged', 'Manual corrections persist across scans'],
      },
      {
        title: 'From map to fix',
        body: 'Click any node to inspect its risks, impact and the recommended fix. The map is the entry point to everything else — security findings, attack paths and simulations all reference the same graph.',
        preview: 'risks',
        bullets: ['Per-node risk inspector', 'Jump to security & attack paths', 'Grounds the AI assistant'],
      },
    ],
  },
  'security-posture': {
    category: 'platform',
    eyebrow: 'Platform',
    title: 'Security Posture',
    lead: 'A single security picture across your code and cloud: static analysis (SAST), dependency scanning (SCA), secret detection and Infrastructure-as-Code — every finding labelled with a confidence level so you act on what’s real.',
    hero: 'security',
    benefits: [
      { title: 'Four engines, one view', desc: 'SAST, SCA, secret scanning and IaC checks run in one scan and roll up into a single posture score.' },
      { title: 'Confidence, not noise', desc: 'Every finding is graded verified / high / heuristic so you know how much trust sits behind it before you spend time on it.' },
      { title: 'Reachability-aware', desc: 'An attack-surface funnel narrows raw findings down to what’s actually in production, exploitable and internet-exposed.' },
    ],
    sections: [
      {
        title: 'Dataflow-based static analysis',
        body: 'Riscly parses your source (not just regex) to find injection, unsafe deserialization, disabled TLS, weak crypto and more — then verifies detected secrets live, upgrading confirmed ones to critical.',
        preview: 'security',
        bullets: ['AST + dataflow SAST', 'Transitive SCA with SBOM', 'Live-verified secret detection'],
      },
      {
        title: 'Triage that sticks',
        body: 'Mark findings as false positive, accepted risk or resolved. Decisions persist across re-scans by a stable fingerprint, so the same finding never re-alerts and your team only sees what matters.',
        preview: 'risks',
        bullets: ['Persistent suppression', 'No repeat alerts', 'Full audit trail of decisions'],
      },
    ],
  },
  'code-quality': {
    category: 'platform',
    eyebrow: 'Platform',
    title: 'Code Quality',
    lead: 'Find the code that isn’t a bug today but will cause incidents tomorrow. Riscly grades every source file for size, complexity, nesting depth and unfinished work, then ranks the riskiest.',
    hero: 'quality',
    benefits: [
      { title: 'Prevent, don’t react', desc: 'Surface fragile, hard-to-change files before they turn into outages or regressions.' },
      { title: 'A clear maintainability score', desc: 'Each file gets a 0–100 risk score from size, branching complexity, nesting and TODO/FIXME density.' },
      { title: 'Refactor where it counts', desc: 'The hotspot ranking tells you exactly which files deserve refactoring and extra test coverage first.' },
    ],
    sections: [
      {
        title: 'Maintainability hotspots',
        body: 'A ranked list of the files most likely to cause future problems, each tagged with why — large-file, high-complexity, deep-nesting or unfinished work — and scored so you can prioritise.',
        preview: 'quality',
        bullets: ['Per-file risk score & tags', 'Language-agnostic heuristics', 'Runs in the same scan as security'],
      },
    ],
  },
  'one-click-fixes': {
    category: 'platform',
    eyebrow: 'Platform',
    title: 'One-click Fixes',
    lead: 'For any code-located finding, Riscly generates the fix, explains why it works, and — with your approval — commits it straight to your repository. No PR juggling, no copy-paste.',
    hero: 'fix',
    benefits: [
      { title: 'Explained, not magic', desc: 'Every fix comes with the corrected code, a plain-language explanation, and references — so you understand the change before applying it.' },
      { title: 'Straight to your repo', desc: 'Apply commits the change to your default branch and hands you the commit link, or opens a pull request if you prefer review first.' },
      { title: 'You stay in control', desc: 'Fixes are suggestions you approve. Nothing touches your code without an explicit click.' },
    ],
    sections: [
      {
        title: 'Preview, then apply',
        body: 'See the exact diff and the reasoning. When you’re happy, one click pushes it — direct commit or PR. Every applied fix is recorded in the audit log with the file and rule.',
        preview: 'fix',
        bullets: ['Diff + explanation + references', 'Direct commit or pull request', 'Audit-logged with actor'],
      },
    ],
  },
  'attack-paths': {
    category: 'platform',
    eyebrow: 'Platform',
    title: 'Attack Paths',
    lead: 'Riscly walks your architecture from internet-facing entry points to sensitive datastores and shows the reachable paths an attacker could follow — ranked by the severity of what lies along them.',
    hero: 'attack',
    benefits: [
      { title: 'Think like an attacker', desc: 'See how exposure chains together: a permissive entry point plus a missing control plus a sensitive store equals a real path.' },
      { title: 'Prioritise the chain', desc: 'Each path is ranked by its worst finding, so you fix the weakest link first.' },
      { title: 'Grounded in your graph', desc: 'Paths are computed from the same architecture map and findings — not a generic checklist.' },
    ],
    sections: [
      {
        title: 'Reachable, not theoretical',
        body: 'Only paths that actually connect an entry point to a sensitive target are shown, with the specific weaknesses along each hop called out.',
        preview: 'attack',
        bullets: ['Entry → datastore enumeration', 'Severity-ranked paths', 'Per-hop weaknesses listed'],
      },
    ],
  },
  'failure-simulation': {
    category: 'platform',
    eyebrow: 'Platform',
    title: 'Failure Simulation',
    lead: 'Simulate an outage — a database lock, a region down, a 10× traffic spike, a payment-provider failure — and see the blast radius and the revenue at risk before it happens in production.',
    hero: 'simulation',
    benefits: [
      { title: 'Quantified, in money', desc: 'With your business context, impact is expressed in revenue and affected users — not abstractions.' },
      { title: 'Find single points of failure', desc: 'See which components, if they fail, take the most of your system (and revenue) down with them.' },
      { title: 'Test fixes before building them', desc: 'Model a mitigation (a read replica, a fallback) and see the risk reduction it would buy.' },
    ],
    sections: [
      {
        title: 'Outage, modelled',
        body: 'Pick a scenario and a duration; Riscly propagates the failure through your dependency graph and estimates downtime, affected users and revenue impact, then suggests the highest-leverage mitigation.',
        preview: 'simulation',
        bullets: ['Infra, traffic & vendor scenarios', 'Revenue-at-risk math', 'Mitigation impact estimates'],
      },
    ],
  },
  'ai-assistant': {
    category: 'platform',
    eyebrow: 'Platform',
    title: 'AI Assistant',
    lead: 'Ask anything about your architecture and risk in plain language. The assistant is grounded in your actual scan — your services, your findings — so the answers are about your system, not generic advice.',
    hero: 'assistant',
    benefits: [
      { title: 'Grounded in your data', desc: 'Answers cite your real architecture and findings, so guidance is specific and actionable.' },
      { title: 'From question to fix', desc: 'Ask “what’s my biggest risk?” and go straight to the explanation and the one-click fix.' },
      { title: 'Plan-aware models', desc: 'Higher plans use stronger Claude models for deeper, more detailed analysis.' },
    ],
    sections: [
      {
        title: 'Your architecture, in conversation',
        body: 'The assistant reads your scanned graph and heuristic risks as context, so you can interrogate your own system, understand trade-offs and get prioritised next steps.',
        preview: 'assistant',
        bullets: ['Context from your latest scan', 'Business-impact aware', 'Links to fixes & simulations'],
      },
    ],
  },

  // --- Solutions ------------------------------------------------------------
  engineering: {
    category: 'solutions',
    eyebrow: 'Solutions',
    title: 'For Engineering teams',
    lead: 'Ship faster without flying blind. Riscly gives every engineer one accurate picture of the system, flags the risky parts, and applies fixes — so you spend time building, not archaeology.',
    hero: 'architecture',
    benefits: [
      { title: 'Onboard in minutes', desc: 'A new engineer sees the whole architecture and where the risk is on day one.' },
      { title: 'Catch problems early', desc: 'Maintainability hotspots and security findings surface in the same scan, before they hit production.' },
      { title: 'Fix in the flow', desc: 'Apply suggested fixes straight to the repo without leaving Riscly.' },
    ],
    sections: [
      { title: 'One map for the whole team', body: 'Stop reverse-engineering the system from memory. The architecture map is always current and shared.', preview: 'architecture' },
      { title: 'Quality before it bites', body: 'Hotspot scoring shows which files to refactor and test first, so tech debt doesn’t become an incident.', preview: 'quality' },
    ],
  },
  'security-teams': {
    category: 'solutions',
    eyebrow: 'Solutions',
    title: 'For Security teams',
    lead: 'Find, prioritise and remediate real, reachable risk — not a wall of noise. SAST, SCA, secrets and IaC in one place, with confidence levels, attack paths and triage that sticks.',
    hero: 'security',
    benefits: [
      { title: 'Signal over noise', desc: 'Confidence levels and reachability put the findings that matter at the top.' },
      { title: 'Triage once', desc: 'Mark false positives and accepted risks; they stay suppressed across re-scans.' },
      { title: 'Prove it', desc: 'A full audit trail of findings, fixes and decisions for reviews.' },
    ],
    sections: [
      { title: 'The whole attack surface', body: 'Four engines roll up into one posture, narrowed by an attack-surface funnel to what’s in production and exposed.', preview: 'security' },
      { title: 'Reachable paths', body: 'See exactly how an attacker could chain exposure into access to sensitive data.', preview: 'attack' },
    ],
  },
  founders: {
    category: 'solutions',
    eyebrow: 'Solutions',
    title: 'For Founders & CTOs',
    lead: 'Understand the reliability and security of your product in business terms. See revenue at risk, the single points of failure, and the posture of your whole stack — without needing a security team.',
    hero: 'simulation',
    benefits: [
      { title: 'Risk in money', desc: 'Revenue-at-risk and outage impact are quantified, so trade-offs are easy to reason about.' },
      { title: 'One number to watch', desc: 'A reliability and security score that trends over time as you improve.' },
      { title: 'No security hire required', desc: 'Riscly does the finding and the fixing; you stay in control of what ships.' },
    ],
    sections: [
      { title: 'Know your blast radius', body: 'Simulate outages and see the revenue and users at stake before incidents happen.', preview: 'simulation' },
      { title: 'Posture at a glance', body: 'A single risk view across code and cloud, with the top issues and their business impact.', preview: 'risks' },
    ],
  },
  compliance: {
    category: 'solutions',
    eyebrow: 'Solutions',
    title: 'Compliance & Audit',
    lead: 'A complete, exportable record of what changed, who changed it and the security posture over time — the evidence reviewers ask for, generated as you work.',
    hero: 'compliance',
    benefits: [
      { title: 'Everything is logged', desc: 'Scans, fixes, connections, triage decisions and member changes are all recorded with the actor.' },
      { title: 'Exportable evidence', desc: 'Pull a workspace’s posture and history for an audit in a couple of clicks.' },
      { title: 'Subprocessors & data', desc: 'Clear documentation of how your code and data are handled.' },
    ],
    sections: [
      { title: 'A trustworthy audit trail', body: 'Every privileged action is captured, so you can answer “who did what, when” with confidence.', preview: 'compliance' },
    ],
  },
  'incident-prevention': {
    category: 'solutions',
    eyebrow: 'Solutions',
    title: 'Incident prevention',
    lead: 'Most incidents start as code that was hard to change and a risk nobody prioritised. Riscly surfaces both early — fragile hotspots and reachable security risk — so you fix them before they page you.',
    hero: 'quality',
    benefits: [
      { title: 'Catch the fragile parts', desc: 'Maintainability hotspots flag the files most likely to break under change.' },
      { title: 'Reachable risk first', desc: 'Attack paths and reachability focus you on issues that can actually be exploited.' },
      { title: 'Get reminded', desc: 'Alerts and re-scan reminders keep new, important risk in front of the team.' },
    ],
    sections: [
      { title: 'Stop the next outage', body: 'Hotspot scoring plus a stale-scan reminder means risky code and drift don’t slip through unnoticed.', preview: 'quality' },
      { title: 'Simulate to be sure', body: 'Validate that a fragile component really is a single point of failure — and what fixing it buys you.', preview: 'simulation' },
    ],
  },
}

export const PLATFORM_SLUGS = Object.keys(FEATURES).filter((k) => FEATURES[k].category === 'platform')
export const SOLUTION_SLUGS = Object.keys(FEATURES).filter((k) => FEATURES[k].category === 'solutions')
