import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import { SectionTabs } from '@/components/dashboard/section-tabs';
import { SubscriptionGate } from '@/components/dashboard/subscription-gate';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubscriptionGate>
      {/* Fixed viewport shell: sidebar + topbar stay put, only the main area scrolls. */}
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto">
            <SectionTabs />
            <div className="space-y-6 p-4 md:p-6">{children}</div>
          </main>
        </div>
      </div>
    </SubscriptionGate>
  );
}
