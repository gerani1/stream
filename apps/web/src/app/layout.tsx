import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { Providers } from '@/components/Providers';
import { WalletButton } from '@/components/WalletButton';

export const metadata: Metadata = {
  title: 'StackStream Bounty Board',
  description: 'Streamed bounties and cohort accelerator programs on Stacks.',
};

const SHELL = 'mx-auto w-full max-w-6xl px-6';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-bg text-fg antialiased">
        <Providers>
          <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
            <nav className={`${SHELL} flex items-center justify-between gap-6 py-4`}>
              <Link href="/" className="flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-lg bg-accent" aria-hidden="true" />
                <span className="font-semibold tracking-tight">Bounty Board</span>
              </Link>
              <div className="flex items-center gap-6 text-sm">
                <Link href="/#how" className="hidden text-muted transition-colors hover:text-fg sm:inline">
                  How it works
                </Link>
                <Link href="/browse" className="text-muted transition-colors hover:text-fg">
                  Browse
                </Link>
                <Link href="/create" className="text-muted transition-colors hover:text-fg">
                  Post a task
                </Link>
                <WalletButton />
              </div>
            </nav>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-border bg-subtle">
            <div className={`${SHELL} flex flex-wrap items-center justify-between gap-4 py-8 text-xs text-muted`}>
              <span>Non-custodial. Funds live on StackStream, never on this board.</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-stacks" aria-hidden="true" />
                Built on Stacks
              </span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
