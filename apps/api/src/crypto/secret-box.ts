import {
  createCipheriv, createDecipheriv, randomBytes, createHash,
} from 'node:crypto';
import { Logger } from '@nestjs/common';

/**
 * Authenticated envelope encryption for secrets at rest (provider tokens).
 *
 * AES-256-GCM. The key comes from CONNECTION_ENCRYPTION_KEY (base64, 32 bytes).
 * In dev/test, if the var is unset, an ephemeral process key is derived with a
 * loud warning — so the API runs locally but production must supply a real key.
 *
 * Ciphertext format: base64( iv(12) || authTag(16) || ciphertext ).
 */
export class SecretBox {
  private readonly key: Buffer;
  private static readonly logger = new Logger('SecretBox');

  constructor(rawKey = process.env.CONNECTION_ENCRYPTION_KEY) {
    if (rawKey) {
      const key = Buffer.from(rawKey, 'base64');
      if (key.length !== 32) {
        throw new Error('CONNECTION_ENCRYPTION_KEY must be base64-encoded 32 bytes');
      }
      this.key = key;
    } else if (process.env.NODE_ENV === 'production') {
      // Never run prod with an ephemeral key: stored tokens would be
      // unrecoverable after a restart and effectively unprotected.
      throw new Error(
        'CONNECTION_ENCRYPTION_KEY is required in production (base64-encoded 32 bytes).',
      );
    } else {
      SecretBox.logger.warn(
        'CONNECTION_ENCRYPTION_KEY not set — using an ephemeral dev key. ' +
          'Set a real key in production; secrets will not survive a restart.',
      );
      this.key = createHash('sha256').update(`dev-${process.pid}`).digest();
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ct]).toString('base64');
  }

  decrypt(envelope: string): string {
    const buf = Buffer.from(envelope, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  }
}
