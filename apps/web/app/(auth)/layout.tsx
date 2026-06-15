import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">FailSafe AI</span>
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">{children}</div>
    </div>
  );
}
