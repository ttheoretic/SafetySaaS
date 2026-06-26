import { createHash, createHmac } from 'node:crypto';

/**
 * Minimal AWS Signature Version 4 signer for query-protocol POST requests
 * (EC2, RDS, …). Dependency-free and pure given an injected timestamp, so it is
 * fully unit-testable. Only what the read-only collectors need — not a general
 * AWS client.
 */

const sha256hex = (data: string | Buffer): string =>
  createHash('sha256').update(data).digest('hex');
const hmac = (key: string | Buffer, data: string): Buffer =>
  createHmac('sha256', key).update(data, 'utf8').digest();

/** AWS signing-key derivation: HMAC chain over date → region → service. */
export function deriveSigningKey(
  secretAccessKey: string,
  datestamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = hmac(`AWS4${secretAccessKey}`, datestamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

export interface SignInput {
  method: string;
  host: string;
  path?: string;
  query?: string;
  body: string;
  service: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  /** Basic ISO format YYYYMMDDTHHMMSSZ — injected so signing is deterministic. */
  amzDate: string;
  contentType?: string;
}

/** Returns the headers (incl. Authorization) to attach to the signed request. */
export function signRequest(i: SignInput): Record<string, string> {
  const contentType = i.contentType ?? 'application/x-www-form-urlencoded; charset=utf-8';
  const datestamp = i.amzDate.slice(0, 8);
  const payloadHash = sha256hex(i.body);

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${i.host}\n` +
    `x-amz-date:${i.amzDate}\n` +
    (i.sessionToken ? `x-amz-security-token:${i.sessionToken}\n` : '');
  const signedHeaders = i.sessionToken
    ? 'content-type;host;x-amz-date;x-amz-security-token'
    : 'content-type;host;x-amz-date';

  const canonicalRequest = [
    i.method,
    i.path ?? '/',
    i.query ?? '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${datestamp}/${i.region}/${i.service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    i.amzDate,
    scope,
    sha256hex(canonicalRequest),
  ].join('\n');

  const signingKey = deriveSigningKey(i.secretAccessKey, datestamp, i.region, i.service);
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  const headers: Record<string, string> = {
    'content-type': contentType,
    'x-amz-date': i.amzDate,
    authorization: `AWS4-HMAC-SHA256 Credential=${i.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
  if (i.sessionToken) headers['x-amz-security-token'] = i.sessionToken;
  return headers;
}

/** Current time in AWS basic ISO format (YYYYMMDDTHHMMSSZ). */
export function amzDateNow(now: Date = new Date()): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
