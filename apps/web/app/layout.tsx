import './globals.css';
import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Riscly — Prevent outages before your customers find them',
  description:
    'Riscly predicts failures, security risks, and revenue loss before they impact your business.',
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0c0f',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
