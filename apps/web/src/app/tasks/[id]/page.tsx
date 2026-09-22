'use client';

import { use } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type StreamStatus, type TaskSummary } from '@/lib/api';
import { formatAmount, formatDuration, tokenLabel } from '@/lib/format';
import { StreamProgress, StateBadge } from '@/components/StreamProgress';

interface TaskDetail extends TaskSummary {
  successCriteria: string;
  participants: Array<{
    id: string;
    status: string;
    allocationAmount: string;
    recipientAddress: string;
    user: { stacksAddress: string };
    stream: { id: string; state: string; amount: string } | null;
  }>;
}

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => api<TaskDetail>(`/tasks/${id}`),
  });

  if (isLoading) return <p className="text-sm text-muted">Loading…</p>;
  if (!task) return <p className="text-sm text-danger">Task not found.</p>;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="text-xs uppercase tracking-wide text-muted">
          {task.type === 'cohort' ? 'Cohort program' : 'Bounty'} · {task.status}
        </span>
        <h1 className="text-2xl font-semibold">{task.title}</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          <span>
            {formatAmount(task.totalAmount)} {tokenLabel(task.tokenKind)}
          </span>
          <span>over {formatDuration(task.durationSeconds)}</span>
          {task.reviewCadence && <span>{task.reviewCadence} review</span>}
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Description</h2>
        <p className="whitespace-pre-wrap text-sm text-muted">{task.description}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Success criteria</h2>
        <p className="whitespace-pre-wrap text-sm text-muted">{task.successCriteria}</p>
      </section>

      {task.participants.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">
            {task.type === 'cohort' ? 'Cohort' : 'Builder'} · {task.participants.length}
          </h2>
          <ul className="grid gap-3">
            {task.participants.map((p) => (
              <li key={p.id} className="rounded-lg border border-line p-4">
                <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                  <span className="font-mono text-xs text-muted">
                    {p.recipientAddress.slice(0, 8)}…{p.recipientAddress.slice(-4)}
                  </span>
                  {p.status === 'flagged' ? (
                    <span className="text-warn" title="Flagged at the last review; the stream keeps running">
                      Flagged
                    </span>
                  ) : (
                    <StateBadge state={p.stream?.state ?? p.status} />
                  )}
                </div>
                {p.stream && <LiveStream streamId={p.stream.id} amount={p.allocationAmount} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="border-t border-line pt-4 text-xs text-muted">
        Streamed funds are final. Pausing or stopping halts future disbursement only — value already
        streamed cannot be recovered.
      </p>
    </div>
  );
}

function LiveStream({ streamId, amount }: { streamId: string; amount: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => api<StreamStatus>(`/streams/${streamId}`),
    refetchInterval: 30_000,
  });
  if (!data) return null;
  return (
    <StreamProgress
      status={data}
      amount={amount}
      onReconcile={() => qc.invalidateQueries({ queryKey: ['stream', streamId] })}
    />
  );
}
