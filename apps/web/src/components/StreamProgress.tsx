'use client';

import { useEffect, useState } from 'react';
import type { StreamStatus } from '@/lib/api';
import { formatAmount } from '@/lib/format';
import { Badge } from './ui';

/**
 * Live stream display.
 *
 * Never poll for a number that changes every second. We take the rate and the
 * start time from the server and interpolate locally, reconciling on an
 * interval and on tab focus. This is the difference between one request every
 * thirty seconds and one every second, per viewer, per stream.
 */
export function StreamProgress({
  status,
  amount,
  onReconcile,
}: {
  status: StreamStatus;
  amount: string;
  onReconcile?: () => void;
}) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (status.state !== 'active') return;
    const tick = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(tick);
  }, [status.state]);

  useEffect(() => {
    if (!onReconcile) return;
    const sync = setInterval(onReconcile, 30_000);
    const onFocus = () => onReconcile();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(sync);
      window.removeEventListener('focus', onFocus);
    };
  }, [onReconcile]);

  const total = BigInt(amount || '0');
  const disbursed = interpolate(status, now, total);
  const pct = total === 0n ? 0 : Number((disbursed * 10_000n) / total) / 100;

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold tabular-nums">{formatAmount(disbursed.toString())}</span>
        <span className="text-muted tabular-nums">of {formatAmount(amount)}</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-subtle"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${barColor(status.state)}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <StreamBadge state={status.state} />
        <span className="tabular-nums">{pct.toFixed(2)}%</span>
      </div>
    </div>
  );
}

/** Only an active stream advances; paused, stopped and completed are frozen. */
function interpolate(status: StreamStatus, now: number, total: bigint): bigint {
  const serverDisbursed = BigInt(status.disbursed || '0');
  if (status.state !== 'active') return serverDisbursed;

  const elapsed = BigInt(Math.max(0, now - status.startedAt));
  const projected = BigInt(status.ratePerSecond || '0') * elapsed;
  // Never display less than the server has confirmed: the bar must not run
  // backwards when a reconcile lands.
  const value = projected > serverDisbursed ? projected : serverDisbursed;
  return value > total ? total : value;
}

function barColor(state: StreamStatus['state']): string {
  switch (state) {
    case 'active':
      return 'bg-live';
    case 'paused':
      return 'bg-warn';
    case 'stopped':
      return 'bg-danger';
    case 'completed':
      return 'bg-accent';
  }
}

const STREAM_LABEL: Record<string, string> = {
  active: 'Streaming',
  paused: 'Paused',
  stopped: 'Stopped',
  completed: 'Completed',
  flagged: 'Flagged',
  dropped: 'Dropped',
};

const STREAM_TONE: Record<string, 'neutral' | 'accent' | 'live' | 'warn' | 'danger'> = {
  active: 'live',
  paused: 'warn',
  stopped: 'danger',
  completed: 'accent',
  flagged: 'warn',
  dropped: 'danger',
};

export function StreamBadge({ state, title }: { state: string; title?: string }) {
  return (
    <Badge tone={STREAM_TONE[state] ?? 'neutral'} title={title} dot={state === 'active'}>
      {STREAM_LABEL[state] ?? state}
    </Badge>
  );
}
