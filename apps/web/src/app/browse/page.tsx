'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type TaskSummary } from '@/lib/api';
import { formatAmount, formatDuration, tokenLabel } from '@/lib/format';
import { EmptyState, PageHeader, Spinner, Tag } from '@/components/ui';

const FILTERS = [
  ['all', 'All'],
  ['bounty', 'Bounties'],
  ['cohort', 'Cohorts'],
] as const;

export default function BrowsePage() {
  const [type, setType] = useState<(typeof FILTERS)[number][0]>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', type],
    queryFn: () => api<TaskSummary[]>(`/tasks${type === 'all' ? '' : `?type=${type}`}`),
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-6 py-14">
      <PageHeader
        eyebrow="Open work"
        title="Browse"
        description="Payouts stream continuously to your wallet while you work. Funds never touch this board."
      />

      <div className="inline-flex gap-1 rounded-full bg-subtle p-1">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setType(value)}
            aria-pressed={type === value}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              type === value ? 'bg-surface text-fg shadow-soft' : 'text-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <Spinner label="Loading…" />}
      {error && <p className="text-sm text-danger">Could not load tasks.</p>}
      {data && data.length === 0 && <EmptyState>Nothing open right now.</EmptyState>}

      {data && data.length > 0 && (
        <ul className="space-y-4">
          {data.map((task) => (
            <li key={task.id}>
              <Link href={`/tasks/${task.id}`} className="card-interactive block">
                <div className="flex items-start justify-between gap-8">
                  <div className="min-w-0">
                    <span
                      className={`eyebrow ${
                        task.type === 'cohort' ? 'text-accent' : 'text-live'
                      }`}
                    >
                      {task.type === 'cohort' ? 'Cohort program' : 'Bounty'}
                    </span>
                    <h2 className="mt-2 text-xl font-semibold">{task.title}</h2>
                    <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted">
                      {task.description}
                    </p>
                    {task.skillTags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {task.skillTags.map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xl font-bold tabular-nums">
                      {formatAmount(task.totalAmount)}
                    </div>
                    <div className="text-xs text-muted">{tokenLabel(task.tokenKind)}</div>
                    <div className="mt-3 text-xs text-muted">
                      over {formatDuration(task.durationSeconds)}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
