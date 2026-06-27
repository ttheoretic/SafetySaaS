import type { CodeIssue } from '@riscly/shared';
import { resilientFetch } from './collectors/collector';

/**
 * Live verification of detected secrets. A regex match is only a *possible*
 * secret; calling the provider's read-only identity endpoint proves whether the
 * credential is currently active. A confirmed-live key is upgraded to a critical,
 * `verified` finding — the difference between "rotate this maybe" and "rotate
 * this now, it works".
 *
 * Read-only identity checks only (no side effects). Bounded per scan.
 */

interface Verifier {
  /** Pull the exact token out of the offending line. */
  extract: RegExp;
  /** True when the token authenticates against the provider. */
  check: (token: string, fetchImpl: typeof fetch) => Promise<boolean>;
}

const ghCheck = async (t: string, f: typeof fetch): Promise<boolean> => {
  const r = await resilientFetch(f, 'https://api.github.com/user', {
    headers: { authorization: `Bearer ${t}`, 'user-agent': 'riscly-scanner' },
  });
  return r.ok;
};

const VERIFIERS: Record<string, Verifier> = {
  'secret/github-pat': {
    extract: /\b((?:ghp|gho|ghs)_[0-9A-Za-z]{36})\b/,
    check: ghCheck,
  },
  'secret/github-fine-grained': {
    extract: /(github_pat_[0-9A-Za-z_]{40,})/,
    check: ghCheck,
  },
  'secret/stripe-live-key': {
    extract: /(sk_live_[0-9a-zA-Z]{20,})/,
    check: async (t, f) =>
      (await resilientFetch(f, 'https://api.stripe.com/v1/balance', {
        headers: { authorization: `Bearer ${t}` },
      })).ok,
  },
  'secret/slack-token': {
    extract: /(xox[baprs]-[0-9A-Za-z-]{10,})/,
    check: async (t, f) => {
      const r = await resilientFetch(f, 'https://slack.com/api/auth.test', {
        method: 'POST',
        headers: { authorization: `Bearer ${t}` },
      });
      if (!r.ok) return false;
      const b = (await r.json().catch(() => ({}))) as { ok?: boolean };
      return b.ok === true;
    },
  },
};

/** Verify any secret issues in place, upgrading confirmed-live ones to critical
 *  `verified`. Mutates the passed issues. */
export async function verifySecrets(
  issues: CodeIssue[],
  contents: Array<{ path: string; content: string | undefined }>,
  fetchImpl: typeof fetch,
  max = 10,
): Promise<void> {
  const byPath = new Map(contents.map((c) => [c.path, c.content]));
  let budget = max;
  for (const issue of issues) {
    if (budget <= 0) break;
    const v = VERIFIERS[issue.rule];
    if (!v) continue;
    const content = byPath.get(issue.file);
    const line = (content?.split('\n')[issue.line - 1] ?? issue.snippet ?? '');
    const m = line.match(v.extract);
    if (!m) continue;
    budget--;
    try {
      if (await v.check(m[1], fetchImpl)) {
        issue.confidence = 'verified';
        issue.severity = 'critical';
        issue.title = `Active credential — ${issue.title.replace(/^Possible /, '')}`;
        issue.description = `Verified live: this credential currently authenticates against the provider. ${issue.description} Rotate it immediately.`;
      }
    } catch {
      /* network/verification failure → leave as heuristic */
    }
  }
}
