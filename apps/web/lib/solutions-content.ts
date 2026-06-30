import type { PreviewKey } from '@/components/features/previews'

export interface SolutionContent {
  eyebrow: string
  title: string
  lead: string
  hero: PreviewKey
  /** The pains this persona feels today ("sound familiar?"). */
  problems: { title: string; desc: string }[]
  /** How Riscly helps them, as an ordered journey. */
  journey: { title: string; desc: string }[]
  /** Outcome stats / claims. */
  outcomes: { stat: string; label: string }[]
  /** Slugs of /features/* most relevant to this persona. */
  features: string[]
  quote?: { text: string; who: string }
}

export const SOLUTIONS: Record<string, SolutionContent> = {
  engineering: {
    eyebrow: 'For Engineering teams',
    title: 'Ship faster without flying blind',
    lead: 'Give every engineer one accurate picture of the system, the risky parts flagged, and fixes they can apply in the flow — so time goes into building, not archaeology.',
    hero: 'architecture',
    problems: [
      { title: 'Nobody holds the whole picture', desc: 'The architecture lives in tribal knowledge and a stale diagram from last year.' },
      { title: 'Risk is invisible until it pages you', desc: 'Fragile, complex code and missing safeguards only surface during an incident.' },
      { title: 'Fixing means context-switching', desc: 'Finding an issue, understanding it and patching it spans five tools and an afternoon.' },
    ],
    journey: [
      { title: 'Connect a repo', desc: 'Riscly reads it read-only and maps your real architecture in minutes.' },
      { title: 'See what’s risky', desc: 'Security findings and maintainability hotspots surface in the same scan, with confidence levels.' },
      { title: 'Fix in place', desc: 'Generate an explained fix and commit it straight to the repo — or open a PR for review.' },
      { title: 'Keep it healthy', desc: 'Re-scan on demand; alerts and reminders keep new risk in front of the team.' },
    ],
    outcomes: [
      { stat: 'Minutes', label: 'to onboard a new engineer to the whole system' },
      { stat: '1 view', label: 'for architecture, security and code quality' },
      { stat: 'In-flow', label: 'fixes committed without leaving Riscly' },
    ],
    features: ['architecture-map', 'code-quality', 'one-click-fixes', 'ai-assistant'],
    quote: { text: 'It’s the first time the whole team agrees on what the system actually looks like.', who: 'How teams describe the architecture map' },
  },
  'security-teams': {
    eyebrow: 'For Security teams',
    title: 'Find the risk that’s actually reachable',
    lead: 'SAST, dependency, secret and IaC scanning in one place — with confidence levels, attack paths and triage that sticks, so you spend time on real risk instead of drowning in noise.',
    hero: 'security',
    problems: [
      { title: 'Too many findings, too little signal', desc: 'Scanners produce thousands of alerts with no sense of what’s exploitable.' },
      { title: 'The same false positives, forever', desc: 'You dismiss a finding and it’s back on the next scan, every time.' },
      { title: 'No view of reachability', desc: 'It’s hard to tell which issues an attacker could actually chain into access.' },
    ],
    journey: [
      { title: 'Scan everything once', desc: 'Four engines roll up into a single posture across code and cloud.' },
      { title: 'Focus by reachability', desc: 'An attack-surface funnel narrows raw findings to what’s in production, exploitable and exposed.' },
      { title: 'Triage once', desc: 'Mark false positives and accepted risks — decisions persist across re-scans and silence alerts.' },
      { title: 'Prove it', desc: 'Every finding, fix and decision is captured in an audit trail for reviews.' },
    ],
    outcomes: [
      { stat: 'Less noise', label: 'confidence levels + reachability prioritise real risk' },
      { stat: 'Once', label: 'triage a false positive and it stays suppressed' },
      { stat: 'End-to-end', label: 'from finding to reachable attack path to fix' },
    ],
    features: ['security-posture', 'attack-paths', 'one-click-fixes'],
  },
  founders: {
    eyebrow: 'For Founders & CTOs',
    title: 'Understand your risk in business terms',
    lead: 'See reliability and security as revenue at risk, the single points of failure, and a posture score that trends as you improve — without hiring a security team.',
    hero: 'simulation',
    problems: [
      { title: 'Risk is abstract', desc: 'You can’t tell the board what an outage or a breach would actually cost.' },
      { title: 'Hidden single points of failure', desc: 'One component could take the product — and the revenue — down with it.' },
      { title: 'No security hire yet', desc: 'You need posture and fixes without standing up a whole security function.' },
    ],
    journey: [
      { title: 'Connect & scan', desc: 'Get an architecture map and a reliability + security score in minutes.' },
      { title: 'Quantify the blast radius', desc: 'Simulate outages and see downtime, affected users and revenue at risk.' },
      { title: 'Act on the top risks', desc: 'Apply fixes or model a mitigation and see the risk reduction it buys.' },
      { title: 'Track the trend', desc: 'Watch the score improve over time — a number you can take to the board.' },
    ],
    outcomes: [
      { stat: 'In €', label: 'revenue-at-risk and outage impact, quantified' },
      { stat: '1 score', label: 'reliability + security, trending over time' },
      { stat: '0 hires', label: 'finding and fixing handled for you' },
    ],
    features: ['failure-simulation', 'architecture-map', 'security-posture'],
  },
  compliance: {
    eyebrow: 'Compliance & Audit',
    title: 'Audit-ready, generated as you work',
    lead: 'A complete, exportable record of what changed, who changed it and your security posture over time — the evidence reviewers ask for, without the spreadsheet scramble.',
    hero: 'compliance',
    problems: [
      { title: 'Evidence is a fire drill', desc: 'Every audit means screenshotting and chasing people for “who did what, when”.' },
      { title: 'No single source of truth', desc: 'Posture and changes are scattered across tools and memories.' },
      { title: 'Unclear data handling', desc: 'You can’t easily show how code and data are processed and by whom.' },
    ],
    journey: [
      { title: 'Everything is logged', desc: 'Scans, fixes, connections, triage decisions and member changes are recorded with the actor.' },
      { title: 'Posture over time', desc: 'A trending security and reliability score gives reviewers the trajectory, not just a snapshot.' },
      { title: 'Export on demand', desc: 'Pull a workspace’s posture and history for an audit in a couple of clicks.' },
      { title: 'Document the data path', desc: 'Clear subprocessor and data-handling documentation, ready to share.' },
    ],
    outcomes: [
      { stat: 'Full trail', label: 'every privileged action captured with actor & time' },
      { stat: 'Exportable', label: 'workspace posture & history for reviews' },
      { stat: 'Transparent', label: 'documented subprocessors and data handling' },
    ],
    features: ['security-posture', 'one-click-fixes'],
  },
  'incident-prevention': {
    eyebrow: 'Incident prevention',
    title: 'Catch the next incident before it pages you',
    lead: 'Most incidents start as code that was hard to change and a risk nobody prioritised. Riscly surfaces both early — fragile hotspots and reachable security risk — so you fix them on your terms, not at 3am.',
    hero: 'quality',
    problems: [
      { title: 'Fragile code breaks under change', desc: 'The riskiest files are large, complex and untested — and nobody flagged them.' },
      { title: 'Reachable risk slips through', desc: 'A real, exploitable path hides among low-priority findings.' },
      { title: 'Drift goes unnoticed', desc: 'The system changes; the last scan is weeks old and the picture is stale.' },
    ],
    journey: [
      { title: 'Grade the codebase', desc: 'Maintainability hotspots rank the files most likely to break under change.' },
      { title: 'Prioritise reachable risk', desc: 'Attack paths focus you on issues that can actually be exploited.' },
      { title: 'Validate the worst case', desc: 'Simulate the failure of a fragile component to confirm it’s a real single point of failure.' },
      { title: 'Stay ahead of drift', desc: 'Re-scan reminders and alerts keep new, important risk in view.' },
    ],
    outcomes: [
      { stat: 'Earlier', label: 'fragile code flagged before it causes an outage' },
      { stat: 'Reachable-first', label: 'exploitable risk surfaced ahead of noise' },
      { stat: 'No surprises', label: 'reminders catch drift between scans' },
    ],
    features: ['code-quality', 'failure-simulation', 'attack-paths'],
  },
}

export const SOLUTION_SLUGS = Object.keys(SOLUTIONS)
