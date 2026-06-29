/** Email templates (pure, testable). Simple inline-styled HTML for broad client
 *  support. */

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const shell = (body: string) =>
  `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;color:#111">${body}<p style="color:#aaa;font-size:12px;margin-top:24px">Riscly — architecture &amp; security intelligence.</p></div>`;

/**
 * Welcome email sent on first signup (product sender). Purely informational —
 * onboarding happens inside the app, so this is a greeting and a primer, with no
 * required action / button to click.
 */
export function buildWelcomeEmail(name?: string, appUrl?: string): { subject: string; html: string } {
  const hi = name ? `Hi ${esc(name.split(' ')[0])},` : 'Welcome,';
  const link = appUrl
    ? `<p style="color:#888;margin:16px 0 0;font-size:13px">You can return to Riscly any time at <a href="${esc(appUrl)}" style="color:#4f46e5">${esc(appUrl.replace(/^https?:\/\//, ''))}</a>.</p>`
    : '';
  return {
    subject: 'Welcome to Riscly',
    html: shell(
      `<h2 style="margin:0 0 8px">${hi}</h2>
       <p style="color:#444;margin:0 0 12px">Thanks for signing up. Riscly maps your architecture, finds security &amp; reliability risks across your code, dependencies and cloud, and shows you exactly how to fix them — with a clear risk score you can trace back to its causes.</p>
       <p style="color:#444;margin:0 0 12px">There's nothing to do here — just continue in the app: connect a repository, get your first score, and explore your findings.</p>
       <p style="color:#444;margin:0">We'll also email you the moment a new <strong>critical</strong> risk appears, so you never have to go looking.</p>
       ${link}`,
    ),
  };
}

/** Support request, delivered to the team inbox (support sender, reply-to user). */
export function buildSupportEmail(opts: {
  fromName?: string;
  fromEmail: string;
  org?: string;
  subject: string;
  message: string;
}): { subject: string; html: string } {
  return {
    subject: `[Support] ${opts.subject}`,
    html: shell(
      `<h2 style="margin:0 0 8px">Support request</h2>
       <p style="color:#444;margin:0 0 4px"><strong>From:</strong> ${esc(opts.fromName ?? '')} &lt;${esc(opts.fromEmail)}&gt;</p>
       ${opts.org ? `<p style="color:#444;margin:0 0 4px"><strong>Workspace:</strong> ${esc(opts.org)}</p>` : ''}
       <p style="color:#444;margin:12px 0 4px"><strong>Subject:</strong> ${esc(opts.subject)}</p>
       <div style="white-space:pre-wrap;border-left:3px solid #eee;padding-left:12px;color:#222">${esc(opts.message)}</div>`,
    ),
  };
}
