import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { SecretBox } from './secret-box';

const KEY = randomBytes(32).toString('base64');

describe('SecretBox (AES-256-GCM)', () => {
  it('round-trips a secret', () => {
    const box = new SecretBox(KEY);
    const secret = 'ghp_super_secret_token_123';
    const enc = box.encrypt(secret);
    expect(enc).not.toContain(secret);
    expect(box.decrypt(enc)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const box = new SecretBox(KEY);
    expect(box.encrypt('x')).not.toBe(box.encrypt('x'));
  });

  it('fails authentication on tampering', () => {
    const box = new SecretBox(KEY);
    const enc = box.encrypt('payload');
    const tampered = Buffer.from(enc, 'base64');
    tampered[tampered.length - 1] ^= 0xff; // flip a ciphertext byte
    expect(() => box.decrypt(tampered.toString('base64'))).toThrow();
  });

  it('cannot decrypt with a different key', () => {
    const a = new SecretBox(KEY);
    const b = new SecretBox(randomBytes(32).toString('base64'));
    expect(() => b.decrypt(a.encrypt('secret'))).toThrow();
  });

  it('rejects a key of the wrong length', () => {
    expect(() => new SecretBox(Buffer.from('short').toString('base64'))).toThrow();
  });
});
