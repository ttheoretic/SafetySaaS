import Link from 'next/link'
import { Mail, ShieldCheck, FileText } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/page-shell'

export const metadata = { title: 'Contact — Riscly' }

const CHANNELS = [
  {
    icon: Mail,
    title: 'General & support',
    desc: 'Questions about the product, your account or billing.',
    value: 'support@riscly.app',
    href: 'mailto:support@riscly.app',
  },
  {
    icon: ShieldCheck,
    title: 'Security',
    desc: 'Report a vulnerability or a security concern.',
    value: 'security@riscly.app',
    href: 'mailto:security@riscly.app',
  },
  {
    icon: FileText,
    title: 'Privacy & legal',
    desc: 'Data protection requests and DPAs.',
    value: 'datenschutz@riscly.app',
    href: 'mailto:datenschutz@riscly.app',
  },
]

export default function ContactPage() {
  return (
    <MarketingShell
      eyebrow="Company"
      title="Contact"
      lead="We’re happy to help. Pick the channel that fits — we read every message."
    >
      <div className="grid gap-3 sm:grid-cols-1">
        {CHANNELS.map((c) => (
          <a
            key={c.title}
            href={c.href}
            className="group flex items-start gap-3 rounded-xl border border-border bg-panel p-4 transition-colors hover:border-primary/40"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20">
              <c.icon className="size-4 text-primary" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{c.title}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{c.desc}</p>
              <p className="mt-1 font-mono text-xs text-primary group-hover:underline">{c.value}</p>
            </div>
          </a>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Postal address and full provider details are in the{' '}
        <Link href="/legal/impressum" className="text-primary hover:underline">Impressum</Link>.
        Signed in? You can also send us a message from{' '}
        <span className="font-medium text-foreground">Settings → Support</span>.
      </p>
    </MarketingShell>
  )
}
