'use client';

import { useEffect, useState } from 'react';
import {
  User, Plug, Bell, ShieldCheck, AlertTriangle, Loader2, Check,
} from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { ConnectProviders } from '@/components/ConnectProviders';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your account, integrations and preferences." />
      <div className="space-y-6">
        <GeneralSection />
        <IntegrationsSection />
        <NotificationsSection />
        <SecuritySection />
        <DangerZone />
      </div>
    </>
  );
}

function Section({
  icon, title, description, children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">{icon}</div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50 disabled:opacity-60';

/* -------------------------------- General -------------------------------- */

function GeneralSection() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const dirty = name.trim() !== (user?.name ?? '') && name.trim().length > 0;

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.updateProfile(name.trim());
      updateUser({ name: updated.name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      icon={<User className="size-4 text-primary" />}
      title="General"
      description="Your profile and sign-in details."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </Field>
        <Field label="Email (sign-in)">
          <input className={inputCls} value={user?.email ?? ''} disabled />
        </Field>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty || busy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Save changes
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <Check className="size-3.5" /> Saved
          </span>
        )}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </Section>
  );
}

/* ------------------------------ Integrations ----------------------------- */

function IntegrationsSection() {
  return (
    <Section
      icon={<Plug className="size-4 text-primary" />}
      title="Integrations"
      description="Connect your code, cloud and infrastructure providers so scans see the real system."
    >
      <ConnectProviders />
    </Section>
  );
}

/* ----------------------------- Notifications ----------------------------- */

const NOTIF_KEY = 'riscly.notifications';
const NOTIF_OPTIONS = [
  { id: 'critical', label: 'Critical risk alerts', desc: 'New critical findings and predicted outages.' },
  { id: 'weekly', label: 'Weekly risk digest', desc: 'A summary of your risk posture every Monday.' },
  { id: 'scans', label: 'Scan completed', desc: 'When a scan finishes and results are ready.' },
  { id: 'product', label: 'Product updates', desc: 'New features and improvements.' },
];

function NotificationsSection() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    critical: true, weekly: true, scans: false, product: false,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch { /* ignore */ }
  }, []);

  function toggle(id: string) {
    setPrefs((p) => {
      const next = { ...p, [id]: !p[id] };
      try { localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <Section
      icon={<Bell className="size-4 text-primary" />}
      title="Notifications"
      description="Choose what we email you about."
    >
      <ul className="divide-y divide-border">
        {NOTIF_OPTIONS.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm text-foreground">{o.label}</p>
              <p className="text-xs text-muted-foreground">{o.desc}</p>
            </div>
            <button
              role="switch"
              aria-checked={prefs[o.id]}
              onClick={() => toggle(o.id)}
              className={
                'relative h-6 w-11 shrink-0 rounded-full transition-colors ' +
                (prefs[o.id] ? 'bg-primary' : 'bg-muted/40')
              }
            >
              <span
                className={
                  'absolute top-0.5 size-5 rounded-full bg-white transition-transform ' +
                  (prefs[o.id] ? 'translate-x-[22px]' : 'translate-x-0.5')
                }
              />
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ------------------------------- Security -------------------------------- */

function SecuritySection() {
  const signOut = useAuth((s) => s.signOut);
  return (
    <Section
      icon={<ShieldCheck className="size-4 text-primary" />}
      title="Security & sessions"
      description="Protect your account and manage active sessions."
    >
      <div className="space-y-3">
        <Row
          title="Two-factor authentication"
          desc="Add a second factor to your sign-in. Managed by your identity provider."
          action={<span className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground">Via SSO</span>}
        />
        <Row
          title="Sign out of this device"
          desc="End your current session in this browser."
          action={
            <button
              onClick={signOut}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card"
            >
              Sign out
            </button>
          }
        />
      </div>
    </Section>
  );
}

function Row({ title, desc, action }: { title: string; desc: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <div>
        <p className="text-sm text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------ Danger zone ------------------------------ */

function DangerZone() {
  return (
    <section className="rounded-xl border border-destructive/30 bg-destructive/5">
      <header className="flex items-start gap-3 border-b border-destructive/20 px-5 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-destructive/15">
          <AlertTriangle className="size-4 text-destructive" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Danger zone</h2>
          <p className="text-xs text-muted-foreground">Irreversible account actions.</p>
        </div>
      </header>
      <div className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-foreground">Delete account</p>
          <p className="text-xs text-muted-foreground">
            Permanently remove your account and organization data. Contact support to confirm.
          </p>
        </div>
        <a
          href="mailto:support@riscly.ai?subject=Delete%20my%20account"
          className="shrink-0 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          Request deletion
        </a>
      </div>
    </section>
  );
}
