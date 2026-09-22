'use client';

import { use, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatAmount } from '@/lib/format';

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
    mutationFn: (input: { participantId: string; value: 'continue' | 'flag' | 'drop' }) =>
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

  if (!task) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{task.title}</h1>
        <p className="mt-1 text-sm text-muted">Committee review</p>
      </header>

      {cycles && cycles.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {cycles.map((c) => (
            <button
              key={c.id}
              onClick={() => setCycleId(c.id)}
              className={`rounded-full border px-3 py-1 ${
                activeCycle === c.id ? 'border-accent text-accent' : 'border-line text-muted'
              }`}
            >
              Cycle {c.sequence} · {c.status}
            </button>
          ))}
        </div>
      )}

      <ul className="grid gap-4">
        {task.participants.map((p) => {
          const latest = p.reports?.[0];
          return (
            <li key={p.id} className="rounded-lg border border-line p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-xs text-muted">
                    {p.recipientAddress.slice(0, 8)}…{p.recipientAddress.slice(-4)}
                  </span>
                  <div className="mt-1 text-sm">
                    {formatAmount(p.allocationAmount)} STX allocated
                  </div>
                </div>
                {p.status === 'flagged' && (
                  <span
                    className="rounded bg-warn/10 px-2 py-1 text-xs text-warn"
                    title="Flagged at the last review. The stream keeps running; this review decides."
                  >
                    Flagged — decisive review
                  </span>
                )}
                {p.status === 'dropped' && (
                  <span className="rounded bg-danger/10 px-2 py-1 text-xs text-danger">Dropped</span>
                )}
              </div>

              {latest ? (
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
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
                <p className="mt-4 text-sm text-muted">No report submitted for this cycle.</p>
              )}

              {latest?.shipped && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{latest.shipped}</p>
              )}

              {activeCycle && p.status !== 'dropped' && (
                <div className="mt-4 flex gap-2 text-xs">
                  {(['continue', 'flag', 'drop'] as const).map((value) => (
                    <button
                      key={value}
                      onClick={() => vote.mutate({ participantId: p.id, value })}
                      className="rounded-md border border-line px-3 py-1.5 capitalize hover:border-accent"
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
        <div className="border-t border-line pt-4">
          <button
            onClick={() => finalize.mutate()}
            disabled={finalize.isPending}
            className="btn-primary"
          >
            {finalize.isPending ? 'Resolving…' : 'Finalize cycle'}
          </button>
          <p className="mt-2 text-xs text-muted">
            Finalizing applies the two-strike rule: an unflagged project can only be flagged, never
            dropped outright. Streams are stopped only for projects dropped by vote.
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`tabular-nums ${tone === 'danger' ? 'text-danger' : ''}`}>{value}</dd>
    </div>
  );
}
