'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type TaskSummary } from '@/lib/api';
import { formatAmount, formatDuration, tokenLabel } from '@/lib/format';

export default function BrowsePage() {
  const [type, setType] = useState<'all' | 'bounty' | 'cohort'>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', type],
    queryFn: () => api<TaskSummary[]>(`/tasks${type === 'all' ? '' : `?type=${type}`}`),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Open work</h1>
        <p className="mt-1 text-sm text-muted">
          Payouts stream continuously to your wallet while you work. Funds never touch this board.
        </p>
      </div>

      <div className="flex gap-2 text-sm">
        {(['all', 'bounty', 'cohort'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full border px-3 py-1 capitalize transition ${
              type === t ? 'border-accent text-accent' : 'border-line text-muted hover:text-fg'
            }`}
          >
            {t === 'all' ? 'All' : t === 'bounty' ? 'Bounties' : 'Cohorts'}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-danger">Could not load tasks.</p>}

      <ul className="grid gap-3">
        {data?.map((task) => (
          <li key={task.id}>
            <Link
              href={`/tasks/${task.id}`}
              className="block rounded-lg border border-line p-4 transition hover:border-accent"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wide text-muted">
                    {task.type === 'cohort' ? 'Cohort program' : 'Bounty'}
                  </span>
                  <h2 className="mt-1 font-medium">{task.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{task.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-medium tabular-nums">
                    {formatAmount(task.totalAmount)} {tokenLabel(task.tokenKind)}
                  </div>
                  <div className="text-xs text-muted">over {formatDuration(task.durationSeconds)}</div>
                </div>
              </div>
              {task.skillTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {task.skillTags.map((tag) => (
                    <span key={tag} className="rounded bg-line/60 px-2 py-0.5 text-xs text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {data?.length === 0 && <p className="text-sm text-muted">Nothing open right now.</p>}
    </div>
  );
}
