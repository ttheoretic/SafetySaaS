/** OAuth provider abstraction (authorization-code flow). */

export interface OAuthExchangeResult {
  accessToken: string;
  /** External account identity (e.g. GitHub login). */
  externalAccountId?: string;
  /** Non-secret config discovered during the exchange (e.g. repo list). */
  metadata?: Record<string, unknown>;
}

export interface OAuthProvider {
  readonly name: string;
  /** Build the provider's authorization URL for the given signed state. */
  authorizeUrl(state: string, redirectUri: string): string;
  /** Exchange the callback code for an access token (+ discovered metadata). */
  exchangeCode(code: string, redirectUri: string): Promise<OAuthExchangeResult>;
}
