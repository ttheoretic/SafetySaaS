import { createSign } from 'crypto';

/**
 * GitHub App support (installation flow). Unlike an OAuth App, a GitHub App lets
 * the user pick *which repositories* to grant during installation (the native
 * "All / Only select repositories" screen, like Vercel/Render). We never store a
 * long-lived user token: at scan time we mint a short-lived installation token
 * from the App's private key.
 *
 * Configured via GITHUB_APP_ID, GITHUB_APP_SLUG and GITHUB_APP_PRIVATE_KEY.
 */
export interface GithubAppConfig {
  appId: string;
  slug: string;
  privateKey: string;
}

const API = 'https://api.github.com';

export function githubAppConfig(): GithubAppConfig | null {
  const appId = process.env.GITHUB_APP_ID;
  const slug = process.env.GITHUB_APP_SLUG;
  let privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !slug || !privateKey) return null;
  // Env vars commonly carry the PEM with literal "\n" — restore real newlines.
  privateKey = privateKey.replace(/\\n/g, '\n');
  return { appId, slug, privateKey };
}

export function isGithubAppConfigured(): boolean {
  return githubAppConfig() !== null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/** Mint a short-lived (≤10 min) app JWT (RS256) for app-level GitHub API calls. */
export function createAppJwt(cfg: GithubAppConfig): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  // iat backdated 30s to tolerate minor clock skew; exp well under the 10m cap.
  const payload = base64url(JSON.stringify({ iat: now - 30, exp: now + 9 * 60, iss: cfg.appId }));
  const signingInput = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  return `${signingInput}.${base64url(signer.sign(cfg.privateKey))}`;
}

/** Exchange the app JWT for an installation access token (expires in ~1h). */
export async function mintInstallationToken(
  installationId: string,
  fetchImpl: typeof fetch = fetch,
  cfg: GithubAppConfig | null = githubAppConfig(),
): Promise<string> {
  if (!cfg) throw new Error('GitHub App is not configured');
  const jwt = createAppJwt(cfg);
  const res = await fetchImpl(`${API}/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'riscly',
    },
  });
  if (!res.ok) throw new Error(`Installation token request failed: ${res.status}`);
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error('No installation token returned');
  return body.token;
}

/** List the repos the installation can access — i.e. the user's native pick. */
export async function listInstallationRepos(
  installationId: string,
  fetchImpl: typeof fetch = fetch,
  cfg: GithubAppConfig | null = githubAppConfig(),
): Promise<string[]> {
  const token = await mintInstallationToken(installationId, fetchImpl, cfg);
  const repos: string[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetchImpl(`${API}/installation/repositories?per_page=100&page=${page}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'riscly',
      },
    });
    if (!res.ok) break;
    const body = (await res.json()) as { repositories?: Array<{ full_name?: string }> };
    const names = (body.repositories ?? [])
      .map((r) => r.full_name)
      .filter((n): n is string => Boolean(n));
    repos.push(...names);
    if (names.length < 100) break;
  }
  return repos;
}

/** The native installation URL — GitHub shows its own repo-selection screen. */
export function githubAppInstallUrl(state: string, cfg: GithubAppConfig | null = githubAppConfig()): string {
  if (!cfg) throw new Error('GitHub App is not configured');
  return `https://github.com/apps/${cfg.slug}/installations/new?state=${encodeURIComponent(state)}`;
}
