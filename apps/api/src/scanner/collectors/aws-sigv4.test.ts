import { describe, it, expect } from 'vitest';
import { deriveSigningKey, signRequest } from './aws-sigv4';

describe('AWS SigV4', () => {
  // Known-answer vector from the AWS documentation ("derive a signing key").
  it('derives the documented signing key', () => {
    const key = deriveSigningKey(
      'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
      '20150830',
      'us-east-1',
      'iam',
    );
    expect(key.toString('hex')).toBe(
      'c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9',
    );
  });

  it('produces a well-formed, deterministic Authorization header', () => {
    const base = {
      method: 'POST',
      host: 'ec2.us-east-1.amazonaws.com',
      body: 'Action=DescribeSecurityGroups&Version=2016-11-15',
      service: 'ec2',
      region: 'us-east-1',
      accessKeyId: 'AKIDEXAMPLE',
      secretAccessKey: 'secret',
      amzDate: '20240101T000000Z',
    };
    const a = signRequest(base);
    const b = signRequest(base);
    expect(a.authorization).toBe(b.authorization);
    expect(a.authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/20240101\/us-east-1\/ec2\/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=[0-9a-f]{64}$/,
    );
    // A different secret yields a different signature.
    expect(signRequest({ ...base, secretAccessKey: 'other' }).authorization).not.toBe(a.authorization);
  });

  it('includes the session token header when present', () => {
    const h = signRequest({
      method: 'POST',
      host: 'rds.eu-central-1.amazonaws.com',
      body: 'Action=DescribeDBInstances',
      service: 'rds',
      region: 'eu-central-1',
      accessKeyId: 'AKID',
      secretAccessKey: 'secret',
      sessionToken: 'session-xyz',
      amzDate: '20240101T000000Z',
    });
    expect(h['x-amz-security-token']).toBe('session-xyz');
    expect(h.authorization).toContain('x-amz-security-token');
  });
});
