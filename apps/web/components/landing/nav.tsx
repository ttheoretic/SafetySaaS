import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

const LINKS = [
  { href: '#problem', label: 'Problem' },
  { href: '#features', label: 'Features' },
  { href: '#simulation', label: 'Demo' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Riscly</span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:block">
            Sign in
          </Link>
          <Link href="/login?mode=signup" className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
