'use client';

import { use } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type StreamStatus, type TaskSummary } from '@/lib/api';
import { formatAmount, formatDuration, tokenLabel } from '@/lib/format';
import { StreamProgress, StreamBadge } from '@/components/StreamProgress';
import { Address, Meta, Notice, PageHeader, Section, Spinner } from '@/components/ui';

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

  if (isLoading)
    return (
      <div className="mx-auto max-w-6xl px-6 py-14">
        <Spinner label="Loading…" />
      </div>
    );
  if (!task)
    return (
      <div className="mx-auto max-w-6xl px-6 py-14">
        <p className="text-sm text-danger">Task not found.</p>
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 px-6 py-14">
      <PageHeader
        eyebrow={`${task.type === 'cohort' ? 'Cohort program' : 'Bounty'} · ${task.status}`}
        title={task.title}
        meta={
          <>
            <Meta label="Total">
              {formatAmount(task.totalAmount)} {tokenLabel(task.tokenKind)}
            </Meta>
            <Meta label="Duration">{formatDuration(task.durationSeconds)}</Meta>
            {task.reviewCadence && (
              <Meta label="Review">{task.reviewCadence.replace('_', ' ')}</Meta>
            )}
            <Meta label="Recipients">{task.participants.length || '—'}</Meta>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-10">
          <Section title="Description">
            <p className="max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {task.description}
            </p>
          </Section>

          <Section title="Success criteria">
            <p className="max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {task.successCriteria}
            </p>
          </Section>

          {task.participants.length > 0 && (
            <Section title={task.type === 'cohort' ? 'Cohort' : 'Builder'}>
              <ul className="space-y-4">
                {task.participants.map((p) => (
                  <li key={p.id} className="card-flat">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <Address value={p.recipientAddress} />
                      {p.status === 'flagged' ? (
                        <StreamBadge
                          state="flagged"
                          title="Flagged at the last review. The stream keeps running; the next review decides."
                        />
                      ) : (
                        <StreamBadge state={p.stream?.state ?? p.status} />
                      )}
                    </div>
                    {p.stream && <LiveStream streamId={p.stream.id} amount={p.allocationAmount} />}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24">
          <Notice>
            Streamed funds are final. Pausing or stopping halts future disbursement only — value
            already streamed cannot be recovered.
          </Notice>
        </aside>
      </div>
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
