/**
 * Parsing and validating the one thing the public preview accepts: a reference
 * to a *public* GitHub repository.
 *
 * This is the only user-controlled value that reaches an outbound request on an
 * unauthenticated endpoint, so it is parsed strictly rather than cleaned up:
 * anything that is not plainly `owner/name` on github.com is rejected, not
 * coerced. That closes the obvious SSRF shape (feeding a host or a path of your
 * choosing into our fetcher) and keeps the surface one API we control.
 */

/** GitHub's own limits: owners ≤39 chars, repo names ≤100. */
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const NAME = /^[A-Za-z0-9_.-]{1,100}$/;

/** Hosts we accept a URL form from. Anything else is refused outright. */
const ALLOWED_HOSTS = new Set(['github.com', 'www.github.com']);

export interface RepoRef {
  owner: string;
  name: string;
  /** Canonical "owner/name", the only form passed downstream. */
  full: string;
}

/**
 * Accepts `owner/name`, `github.com/owner/name` or a full GitHub URL and
 * returns the canonical ref. Returns null for anything else — callers turn that
 * into a 400 without echoing the input back.
 */
export function parseRepoRef(input: unknown): RepoRef | null {
  if (typeof input !== 'string') return null;
  let raw = input.trim();
  if (raw.length === 0 || raw.length > 200) return null;

  if (/^https?:\/\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }
    if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;
    raw = url.pathname;
  } else if (/^(www\.)?github\.com\//i.test(raw)) {
    raw = raw.replace(/^(www\.)?github\.com/i, '');
  }

  // Normalise the shorthand forms people paste: leading slash, trailing slash,
  // a .git suffix, or a deep link to a branch/file.
  raw = raw.replace(/^\/+/, '').replace(/\.git$/i, '');
  const parts = raw.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const [owner, name] = parts;
  // A deep link is fine (we take owner/name), but only when the third segment
  // is a known GitHub sub-path — not an arbitrary trailing path.
  if (parts.length > 2 && !isKnownSubPath(parts[2])) return null;
  if (!OWNER.test(owner) || !NAME.test(name)) return null;
  if (name === '.' || name === '..') return null;

  return { owner, name, full: `${owner}/${name}` };
}

function isKnownSubPath(segment: string): boolean {
  return [
    'tree', 'blob', 'commits', 'commit', 'pull', 'pulls', 'issues',
    'releases', 'tags', 'branches', 'actions', 'wiki', 'settings',
  ].includes(segment.toLowerCase());
}
