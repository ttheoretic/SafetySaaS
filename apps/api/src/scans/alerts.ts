import type { Finding } from '@riscly/shared';

/**
 * Critical-risk alerting (pure helpers). The product reaching out the moment a
 * dangerous, *proven* risk appears is what turns it from "a tool you remember to
 * open" into "the thing that pings you when it matters".
 */

/** Stable identity of a finding, so we can tell new ones from carried-over ones. */
function key(f: Finding): string {
  return `${f.severity}|${f.title}|${f.rule ?? ''}|${f.file ?? ''}`;
}

/** Worth waking someone for: a critical, or a verified high+ (proven, not a guess). */
function isAlertable(f: Finding): boolean {
  if (f.severity === 'critical') return true;
  return f.confidence === 'verified' && f.severity === 'high';
}

/** The alertable findings in `current` that weren't already present in `prior`. */
export function newAlertableFindings(current: Finding[], prior: Finding[]): Finding[] {
  const seen = new Set(prior.map(key));
  return current.filter((f) => isAlertable(f) && !seen.has(key(f)));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Build the critical-risk alert email (subject + simple, client-safe HTML). */
export function buildCriticalAlertEmail(
  projectName: string,
  findings: Finding[],
  appUrl?: string,
): { subject: string; html: string } {
  const n = findings.length;
  const subject = `Riscly: ${n} new critical risk${n === 1 ? '' : 's'} in ${projectName}`;

  const rows = findings
    .slice(0, 15)
    .map((f) => {
      const where = f.file ? ` — ${escapeHtml(f.file)}${f.line ? `:${f.line}` : ''}` : '';
      const tag = f.confidence === 'verified' ? ' [verified]' : '';
      return `<li style="margin:6px 0"><strong>${escapeHtml(f.severity.toUpperCase())}</strong>${tag} ${escapeHtml(f.title)}<span style="color:#888">${where}</span></li>`;
    })
    .join('');
  const more = n > 15 ? `<p style="color:#888">…and ${n - 15} more.</p>` : '';
  const link = appUrl
    ? `<p style="margin-top:16px"><a href="${escapeHtml(appUrl)}/risks" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Review &amp; fix</a></p>`
    : '';

  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;color:#111">
    <h2 style="margin:0 0 4px">New critical risks detected</h2>
    <p style="color:#555;margin:0 0 12px">The latest scan of <strong>${escapeHtml(projectName)}</strong> introduced ${n} new high-impact finding${n === 1 ? '' : 's'}.</p>
    <ul style="padding-left:18px;margin:0">${rows}</ul>
    ${more}
    ${link}
    <p style="color:#aaa;font-size:12px;margin-top:20px">You're receiving this because you're a member of this Riscly workspace.</p>
  </div>`;

  return { subject, html };
}
