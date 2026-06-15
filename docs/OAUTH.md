# Provider OAuth

Real authorization-code OAuth for connecting providers, starting with GitHub.
The resulting access token is stored **encrypted** (AES-256-GCM) as a project
connection and used by the scanner.

```
 Settings ──▶ GET /api/oauth/github/authorize?projectId=…   (auth + connection:write)
                       │  returns { url } with a signed, expiring `state`
                       ▼
              GitHub consent screen
                       │  redirects to
                       ▼
 GET /api/oauth/github/callback?code=…&state=…   (PUBLIC)
   verify+decrypt state ─▶ exchange code for token ─▶ discover login + repos
   ─▶ store encrypted connection ─▶ redirect to APP_URL/settings?connected=github
```

## Why the callback is public but safe

The callback can't carry the user's auth header (the browser arrives from
GitHub), so trust comes from the **`state`** instead: an AES-256-GCM envelope
(`SecretBox`) carrying `{ orgId, projectId, userId, provider, exp }`. It can't
be forged or read, expires after 10 minutes, and is bound to one provider — so
the callback cannot be replayed or aimed at another tenant.

## Components (`apps/api/src/oauth`)

- **`OAuthProvider`** — `authorizeUrl(state, redirectUri)` + `exchangeCode(code,
  redirectUri)`. `GithubOAuthProvider` implements it (injectable `fetch`),
  discovering the account login and up to 50 repos so the connection is
  immediately scannable.
- **`OAuthService`** — signs/verifies state, drives the exchange, and writes the
  encrypted connection. New providers register here.

## Config

```
GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET   # the GitHub OAuth app
OAUTH_REDIRECT_BASE                       # base for the callback URL
APP_URL                                   # where the callback returns the user
```

Without `GITHUB_CLIENT_ID/SECRET`, GitHub OAuth is disabled and `authorize`
returns 400 (`provider not configured`). Other providers remain token-based.

## Frontend

The **Settings → Connect providers** card (`components/ConnectProviders.tsx`)
picks a project and redirects into the GitHub consent screen via
`GET /oauth/github/authorize`.

## Tests

`apps/api/src/oauth/oauth.test.ts` — authorize URL + encrypted state, callback
stores an encrypted token, tamper/expiry rejection, and the GitHub code
exchange with a mocked GitHub API.
