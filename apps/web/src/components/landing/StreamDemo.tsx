'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Wallet } from 'lucide-react';

const TOTAL = 1_200;
const CYCLE_SECONDS = 24;

/**
 * Animated illustration of a live stream.
 *
 * Deliberately self-contained and fake: it takes no props and touches no API,
 * so the landing page stays static and cannot break when the backend is down.
 * The point is to show that value accrues continuously rather than in one lump.
 */
export function StreamDemo() {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setElapsed(CYCLE_SECONDS * 0.62);
      return;
    }

    last.current = performance.now();
    const tick = (now: number) => {
      const delta = (now - last.current) / 1000;
      last.current = now;
      if (!paused) setElapsed((e) => (e + delta) % CYCLE_SECONDS);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [paused]);

  const pct = (elapsed / CYCLE_SECONDS) * 100;
  const streamed = (TOTAL * pct) / 100;

  return (
    <div
      className="w-full rounded-3xl border border-border bg-surface p-6 shadow-lift sm:w-96"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-full bg-subtle px-3 py-1.5">
          <Wallet className="h-3.5 w-3.5 text-muted" />
          <span className="font-mono text-xs text-muted">SP2J6…8QK4</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-live-soft px-3 py-1.5 text-xs font-semibold text-live">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
          </span>
          Streaming live
        </span>
      </div>

      <div className="mt-7 flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums tracking-tight">
          {streamed.toFixed(2)}
        </span>
        <span className="text-sm text-muted">/ {TOTAL.toLocaleString()} STX</span>
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-subtle">
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5 text-center">
        <div>
          <div className="text-xs text-muted">Duration</div>
          <div className="mt-1 text-sm font-semibold tabular-nums">12 wks</div>
        </div>
        <div>
          <div className="text-xs text-muted">Rate</div>
          <div className="mt-1 text-sm font-semibold tabular-nums">100/wk</div>
        </div>
        <div>
          <div className="text-xs text-muted">Custody</div>
          <div className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold text-accent">
            You <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>

      <p className="sr-only">
        An illustration of a payment stream delivering {TOTAL} STX continuously over twelve weeks.
      </p>
    </div>
  );
}
