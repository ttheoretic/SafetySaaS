import './globals.css';
import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'FailSafe AI',
  description: 'Find problems before they happen.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 px-8 py-6 max-w-6xl">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
