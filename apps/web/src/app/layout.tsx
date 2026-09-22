import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { WalletButton } from '@/components/WalletButton';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'StackStream Bounty Board',
  description: 'Streamed bounties and cohort accelerator programs on Stacks.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>
          <header className="border-b border-line">
            <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
              <Link href="/" className="font-semibold">
                Bounty Board
              </Link>
              <div className="flex items-center gap-4 text-sm">
                <Link href="/" className="text-muted hover:text-fg">
                  Browse
                </Link>
                <Link href="/create" className="text-muted hover:text-fg">
                  Post a task
                </Link>
                <WalletButton />
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
