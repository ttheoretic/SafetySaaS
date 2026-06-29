import { describe, it, expect, afterEach } from 'vitest';
import { senderFor, supportInbox } from './email.module';
import { buildWelcomeEmail, buildSupportEmail } from './templates';

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
});

describe('senderFor', () => {
  it('uses category defaults on a configured domain', () => {
    process.env.EMAIL_DOMAIN = 'riscly.ai';
    delete process.env.EMAIL_FROM;
    delete process.env.EMAIL_FROM_ALERTS;
    expect(senderFor('product')).toBe('Riscly <hello@riscly.ai>');
    expect(senderFor('alerts')).toBe('Riscly Alerts <alerts@riscly.ai>');
    expect(senderFor('support')).toBe('Riscly Support <support@riscly.ai>');
    expect(supportInbox()).toBe('support@riscly.ai');
  });

  it('prefers an explicit per-category override', () => {
    process.env.EMAIL_FROM_ALERTS = 'Alerts <noc@acme.io>';
    expect(senderFor('alerts')).toBe('Alerts <noc@acme.io>');
  });
});

describe('email templates', () => {
  it('welcome email greets by first name and links to the app', () => {
    const { subject, html } = buildWelcomeEmail('Ada Lovelace', 'https://app.riscly.ai');
    expect(subject).toBe('Welcome to Riscly');
    expect(html).toContain('Hi Ada,');
    expect(html).toContain('https://app.riscly.ai');
  });

  it('support email escapes user content and prefixes the subject', () => {
    const { subject, html } = buildSupportEmail({
      fromEmail: 'u@x.io',
      org: 'Acme',
      subject: 'Bug',
      message: '<script>alert(1)</script>',
    });
    expect(subject).toBe('[Support] Bug');
    expect(html).toContain('u@x.io');
    expect(html).toContain('&lt;script&gt;');
  });
});
