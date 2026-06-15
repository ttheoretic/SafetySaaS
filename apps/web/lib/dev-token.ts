/**
 * Mints the API's dev token (`dev.<base64url-json>`), accepted by the backend
 * only when SUPABASE_JWT_SECRET is unset. In production this is replaced by a
 * real Supabase access token from `@supabase/supabase-js` — the rest of the
 * frontend treats it as an opaque Bearer token, so swapping the login flow is
 * mechanical.
 */
export function mintDevToken(claims: { sub: string; email: string; name?: string }): string {
  const json = JSON.stringify(claims);
  const b64 =
    typeof window === 'undefined'
      ? Buffer.from(json).toString('base64')
      : btoa(unescape(encodeURIComponent(json)));
  const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `dev.${b64url}`;
}
