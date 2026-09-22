'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { formatAmount } from '@/lib/format';

type Step = 'details' | 'deposit' | 'configure' | 'done';

/**
 * The deposit is what creates the task — this is the highest-stakes screen in
 * the product, so it is a dedicated flow with an explicit review-before-sign
 * summary, and recipients are only collected once the deposit has confirmed.
 */
export default function CreateTaskPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [details, setDetails] = useState({
    type: 'bounty' as 'bounty' | 'cohort',
    title: '',
    description: '',
    successCriteria: '',
    skillTags: '',
    totalAmount: '',
  });

  const [config, setConfig] = useState({
    durationWeeks: 4,
    reviewCadence: 'on_submission' as 'weekly' | 'biweekly' | 'on_submission',
    recipients: '',
  });

  async function createDraft() {
    setBusy(true);
    setError(null);
    try {
      const task = await api<{ id: string }>('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          type: details.type,
          title: details.title,
          description: details.description,
          successCriteria: details.successCriteria,
          skillTags: details.skillTags.split(',').map((s) => s.trim()).filter(Boolean),
          token: { kind: 'stx' },
          totalAmount: details.totalAmount,
        }),
      });
      setTaskId(task.id);
      setStep('deposit');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the task');
    } finally {
      setBusy(false);
    }
  }

  async function deposit() {
    if (!taskId) return;
    setBusy(true);
    setError(null);
    try {
      // The wallet signs this; the board never holds keys or funds.
      const unsigned = await api<{ summary: string; payload: Record<string, unknown> }>(
        `/tasks/${taskId}/deposit/build`,
        { method: 'POST' },
      );
      // TODO(integration): hand `unsigned.payload` to @stacks/connect once the
      // StackStream call shape is settled. Against the mock provider the tx id
      // comes back in the payload, which is what lets this flow run today.
      const txId = String(unsigned.payload.txId);
      await api(`/tasks/${taskId}/deposit/confirm`, {
        method: 'POST',
        body: JSON.stringify({ txId }),
      });
      setStep('configure');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deposit failed');
    } finally {
      setBusy(false);
    }
  }

  async function configure(acknowledgeCadenceWarning = false) {
    if (!taskId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/tasks/${taskId}/configure`, {
        method: 'POST',
        body: JSON.stringify({
          durationSeconds: config.durationWeeks * 7 * 86_400,
          reviewCadence: config.reviewCadence,
          allocation: {
            model: 'even',
            recipients: config.recipients.split(/[\s,]+/).filter(Boolean),
          },
          acknowledgeCadenceWarning,
        }),
      });
      setStep('done');
      router.push(`/tasks/${taskId}`);
    } catch (e) {
      // The API blocks a cadence that leaves too few review cycles for
      // two-strike to reach a drop; the funder can override knowingly.
      if (e instanceof ApiError && e.code === 'CADENCE_WARNING') {
        setError(`${e.message}\n\nPress Configure again to proceed anyway.`);
        setBusy(false);
        return;
      }
      setError(e instanceof Error ? e.message : 'Configuration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Steps current={step} />

      {error && (
        <p className="whitespace-pre-wrap rounded-md border border-warn/40 bg-warn/5 p-3 text-sm text-warn">
          {error}
        </p>
      )}

      {step === 'details' && (
        <section className="space-y-4">
          <h1 className="text-xl font-semibold">Task details</h1>
          <Field label="Type">
            <select
              value={details.type}
              onChange={(e) => setDetails({ ...details, type: e.target.value as 'bounty' | 'cohort' })}
              className="input"
            >
              <option value="bounty">Bounty — one deliverable, one builder</option>
              <option value="cohort">Cohort — multiple projects, periodic review</option>
            </select>
          </Field>
          <Field label="Title">
            <input
              className="input"
              value={details.title}
              onChange={(e) => setDetails({ ...details, title: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <textarea
              className="input min-h-28"
              value={details.description}
              onChange={(e) => setDetails({ ...details, description: e.target.value })}
            />
          </Field>
          <Field label="Success criteria">
            <textarea
              className="input min-h-20"
              value={details.successCriteria}
              onChange={(e) => setDetails({ ...details, successCriteria: e.target.value })}
            />
          </Field>
          <Field label="Skill tags" hint="Comma separated">
            <input
              className="input"
              value={details.skillTags}
              onChange={(e) => setDetails({ ...details, skillTags: e.target.value })}
            />
          </Field>
          <Field label="Total amount" hint="In micro-STX">
            <input
              className="input tabular-nums"
              inputMode="numeric"
              value={details.totalAmount}
              onChange={(e) => setDetails({ ...details, totalAmount: e.target.value })}
            />
          </Field>
          <button onClick={createDraft} disabled={busy} className="btn-primary">
            Continue to deposit
          </button>
        </section>
      )}

      {step === 'deposit' && (
        <section className="space-y-4">
          <h1 className="text-xl font-semibold">Review and deposit</h1>
          <div className="rounded-lg border border-line p-4 text-sm">
            <Row label="Task">{details.title}</Row>
            <Row label="Type">{details.type}</Row>
            <Row label="Amount">{formatAmount(details.totalAmount || '0')} STX</Row>
          </div>
          <p className="rounded-md border border-line bg-line/20 p-3 text-xs text-muted">
            Your deposit goes to StackStream, not to this board — the board never takes custody of
            your funds. Signing this transaction is what creates the task. You will choose recipients
            and duration on the next screen.
          </p>
          <button onClick={deposit} disabled={busy} className="btn-primary">
            {busy ? 'Waiting for confirmation…' : 'Sign deposit'}
          </button>
        </section>
      )}

      {step === 'configure' && (
        <section className="space-y-4">
          <h1 className="text-xl font-semibold">Configure the stream</h1>
          <p className="text-sm text-muted">
            The task is funded. One deposit funds every recipient below in parallel.
          </p>
          <Field label="Recipients" hint="One Stacks address per line. The amount splits evenly.">
            <textarea
              className="input min-h-24 font-mono text-xs"
              value={config.recipients}
              onChange={(e) => setConfig({ ...config, recipients: e.target.value })}
            />
          </Field>
          <Field label="Duration (weeks)">
            <input
              type="number"
              min={1}
              className="input tabular-nums"
              value={config.durationWeeks}
              onChange={(e) => setConfig({ ...config, durationWeeks: Number(e.target.value) })}
            />
          </Field>
          <Field label="Review cadence">
            <select
              className="input"
              value={config.reviewCadence}
              onChange={(e) =>
                setConfig({ ...config, reviewCadence: e.target.value as typeof config.reviewCadence })
              }
            >
              <option value="on_submission">On submission (bounty)</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
            </select>
          </Field>
          <button
            onClick={() => configure(Boolean(error))}
            disabled={busy}
            className="btn-primary"
          >
            Configure and open
          </button>
        </section>
      )}
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const steps: Array<[Step, string]> = [
    ['details', 'Details'],
    ['deposit', 'Deposit'],
    ['configure', 'Configure'],
  ];
  return (
    <ol className="flex gap-2 text-xs">
      {steps.map(([key, label], i) => (
        <li
          key={key}
          className={`rounded-full border px-3 py-1 ${
            current === key ? 'border-accent text-accent' : 'border-line text-muted'
          }`}
        >
          {i + 1}. {label}
        </li>
      ))}
    </ol>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="block text-xs text-muted">{hint}</span>}
      {children}
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-line py-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
