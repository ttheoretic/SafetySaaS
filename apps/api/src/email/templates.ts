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

/** Welcome email sent on first signup (product sender). */
export function buildWelcomeEmail(name?: string, appUrl?: string): { subject: string; html: string } {
  const hi = name ? `Hi ${esc(name.split(' ')[0])},` : 'Welcome,';
  const cta = appUrl
    ? `<p style="margin-top:16px"><a href="${esc(appUrl)}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Connect a repository</a></p>`
    : '';
  return {
    subject: 'Welcome to Riscly',
    html: shell(
      `<h2 style="margin:0 0 8px">${hi}</h2>
       <p style="color:#444;margin:0 0 12px">Welcome to Riscly. Connect a repository and we'll map your architecture, find security &amp; reliability risks, and show you exactly how to fix them.</p>
       <ul style="padding-left:18px;color:#444">
         <li>Verified findings from your code, dependencies and cloud</li>
         <li>A clear risk score, traceable to its causes</li>
         <li>Failure simulations and AI-suggested fixes</li>
       </ul>
       ${cta}`,
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
