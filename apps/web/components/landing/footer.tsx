import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-center md:p-12">
          <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
            Find your next outage before your customers do.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
            Connect your stack and get a reliability score in minutes.
          </p>
          <Link href="/login?mode=signup" className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
            Analyze My Architecture <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-border/60 pt-8 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
              <ShieldCheck className="size-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Riscly</span>
            <span className="text-sm text-muted-foreground">— Find problems before they happen.</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
          </nav>
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Riscly</div>
        </div>
      </div>
    </footer>
  );
}
