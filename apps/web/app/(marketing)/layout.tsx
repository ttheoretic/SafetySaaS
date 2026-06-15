import { LandingNav } from '@/components/landing/nav';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      {children}
    </div>
  );
}
