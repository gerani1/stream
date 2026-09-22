'use client';

import { use, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatAmount } from '@/lib/format';
import { StreamBadge } from '@/components/StreamProgress';
import { Address, EmptyState, Metric, Notice, PageHeader, Spinner } from '@/components/ui';

interface Participant {
  id: string;
  status: string;
  allocationAmount: string;
  recipientAddress: string;
  reports: Array<{
    id: string;
    usersOnboarded: number;
    txCount: number;
    txVolume: string;
    retentionDelta: number;
    shipped: string;
    submittedAt: string;
  }>;
}

interface Cycle {
  id: string;
  sequence: number;
  status: string;
  meetingAt: string;
}

const VOTES = ['continue', 'flag', 'drop'] as const;

/**
 * Committee review surface.
 *
 * The board surfaces data and executes the committee's decision — it does not
 * decide. Nothing here auto-drops a project; a drop happens only when members
 * vote and someone finalizes the cycle.
 */
export default function CommitteePage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = use(params);
  const qc = useQueryClient();
  const [cycleId, setCycleId] = useState<string | null>(null);

  const { data: task } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api<{ title: string; participants: Participant[] }>(`/tasks/${taskId}`),
  });

  const { data: cycles } = useQuery({
    queryKey: ['cycles', taskId],
    queryFn: () => api<Cycle[]>(`/tasks/${taskId}/review-cycles`),
  });

  const activeCycle = cycleId ?? cycles?.find((c) => c.status !== 'finalized')?.id ?? null;

  const vote = useMutation({
    mutationFn: (input: { participantId: string; value: (typeof VOTES)[number] }) =>
      api(`/review-cycles/${activeCycle}/votes`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] }),
  });

  const finalize = useMutation({
    mutationFn: () => api(`/review-cycles/${activeCycle}/finalize`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['cycles', taskId] });
    },
  });

  if (!task)
    return (
      <div className="mx-auto max-w-6xl px-6 py-14">
        <Spinner label="Loading…" />
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-6 py-14">
      <PageHeader eyebrow="Committee review" title={task.title} />

      {cycles && cycles.length > 0 && (
        <div className="inline-flex flex-wrap gap-1 rounded-full bg-subtle p-1 text-xs">
          {cycles.map((c) => (
            <button
              key={c.id}
              onClick={() => setCycleId(c.id)}
              aria-pressed={activeCycle === c.id}
              className={`rounded-full px-4 py-2 font-medium transition-colors ${
                activeCycle === c.id ? 'bg-surface text-fg shadow-soft' : 'text-muted hover:text-fg'
              }`}
            >
              Cycle {c.sequence} · {c.status}
            </button>
          ))}
        </div>
      )}

      {task.participants.length === 0 && <EmptyState>No projects in this cohort yet.</EmptyState>}

      <ul className="space-y-4">
        {task.participants.map((p) => {
          const latest = p.reports?.[0];
          return (
            <li key={p.id} className="card-flat">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Address value={p.recipientAddress} />
                  <div className="mt-1 text-sm">
                    {formatAmount(p.allocationAmount)} STX allocated
                  </div>
                </div>
                {p.status === 'flagged' && (
                  <StreamBadge
                    state="flagged"
                    title="Flagged at the last review. The stream keeps running; this review decides."
                  />
                )}
                {p.status === 'dropped' && <StreamBadge state="dropped" />}
              </div>

              {latest ? (
                <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Metric label="Onboarded" value={latest.usersOnboarded.toLocaleString()} />
                  <Metric label="Transactions" value={latest.txCount.toLocaleString()} />
                  <Metric label="Volume" value={formatAmount(latest.txVolume)} />
                  <Metric
                    label="Retention"
                    value={`${latest.retentionDelta > 0 ? '+' : ''}${latest.retentionDelta}%`}
                    tone={latest.retentionDelta < 0 ? 'danger' : undefined}
                  />
                </dl>
              ) : (
                <p className="mt-5 text-sm text-muted">No report submitted for this cycle.</p>
              )}

              {latest?.shipped && (
                <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-sm leading-relaxed text-muted">
                  {latest.shipped}
                </p>
              )}

              {activeCycle && p.status !== 'dropped' && (
                <div className="mt-5 flex gap-2">
                  {VOTES.map((value) => (
                    <button
                      key={value}
                      onClick={() => vote.mutate({ participantId: p.id, value })}
                      disabled={vote.isPending}
                      className="btn-ghost btn-sm capitalize"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {activeCycle && (
        <div className="space-y-3 border-t border-border pt-8">
          <button
            onClick={() => finalize.mutate()}
            disabled={finalize.isPending}
            className="btn-primary"
          >
            {finalize.isPending ? 'Resolving…' : 'Finalize cycle'}
          </button>
          <Notice>
            Finalizing applies the two-strike rule: an unflagged project can only be flagged, never
            dropped outright. Streams are stopped only for projects dropped by vote.
          </Notice>
        </div>
      )}
    </div>
  );
}
