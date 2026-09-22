'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { formatAmount } from '@/lib/format';
import { Field, Notice, PageHeader, Row } from '@/components/ui';

type Step = 'details' | 'deposit' | 'configure';

const STEPS: Array<[Step, string]> = [
  ['details', 'Details'],
  ['deposit', 'Deposit'],
  ['configure', 'Configure'],
];

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
  const [cadenceOverride, setCadenceOverride] = useState(false);
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

  /** Wraps a step action so every path clears the error and releases the button. */
  async function run(fn: () => Promise<void>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CADENCE_WARNING') {
        // The API blocks a cadence that leaves too few review cycles for
        // two-strike to reach a drop; the funder can override knowingly.
        setCadenceOverride(true);
        setError(`${e.message}\n\nPress Configure again to proceed anyway.`);
        return;
      }
      setError(e instanceof Error ? e.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  const createDraft = () =>
    run(async () => {
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
    }, 'Could not create the task');

  const deposit = () =>
    run(async () => {
      if (!taskId) return;
      // The wallet signs this; the board never holds keys or funds.
      const unsigned = await api<{ summary: string; payload: Record<string, unknown> }>(
        `/tasks/${taskId}/deposit/build`,
        { method: 'POST' },
      );
      // TODO(integration): hand `unsigned.payload` to @stacks/connect once the
      // StackStream call shape is settled. Against the mock provider the tx id
      // comes back in the payload, which is what lets this flow run today.
      await api(`/tasks/${taskId}/deposit/confirm`, {
        method: 'POST',
        body: JSON.stringify({ txId: String(unsigned.payload.txId) }),
      });
      setStep('configure');
    }, 'Deposit failed');

  const configure = () =>
    run(async () => {
      if (!taskId) return;
      await api(`/tasks/${taskId}/configure`, {
        method: 'POST',
        body: JSON.stringify({
          durationSeconds: config.durationWeeks * 7 * 86_400,
          reviewCadence: config.reviewCadence,
          allocation: {
            model: 'even',
            recipients: config.recipients.split(/[\s,]+/).filter(Boolean),
          },
          acknowledgeCadenceWarning: cadenceOverride,
        }),
      });
      router.push(`/tasks/${taskId}`);
    }, 'Configuration failed');

  return (
    <div className="mx-auto w-full max-w-xl space-y-8 px-6 py-14">
      <ol className="flex gap-1 rounded-full bg-subtle p-1 text-xs">
        {STEPS.map(([key, label], i) => (
          <li
            key={key}
            aria-current={step === key ? 'step' : undefined}
            className={`flex-1 rounded-full px-4 py-2.5 text-center font-medium transition-colors ${
              step === key ? 'bg-surface text-fg shadow-soft' : 'text-muted'
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {error && <Notice tone="warn">{error}</Notice>}

      {step === 'details' && (
        <section className="space-y-5">
          <PageHeader title="Task details" />
          <Field label="Type">
            <select
              className="input"
              value={details.type}
              onChange={(e) => setDetails({ ...details, type: e.target.value as 'bounty' | 'cohort' })}
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
          <button onClick={createDraft} disabled={busy} className="btn-primary w-full">
            Continue to deposit
          </button>
        </section>
      )}

      {step === 'deposit' && (
        <section className="space-y-5">
          <PageHeader title="Review and deposit" />
          <div className="card-flat text-sm">
            <Row label="Task">{details.title}</Row>
            <Row label="Type">{details.type}</Row>
            <Row label="Amount">{formatAmount(details.totalAmount || '0')} STX</Row>
          </div>
          <Notice>
            Your deposit goes to StackStream, not to this board — the board never takes custody of
            your funds. Signing this transaction is what creates the task. You will choose recipients
            and duration on the next screen.
          </Notice>
          <button onClick={deposit} disabled={busy} className="btn-primary w-full">
            {busy ? 'Waiting for confirmation…' : 'Sign deposit'}
          </button>
        </section>
      )}

      {step === 'configure' && (
        <section className="space-y-5">
          <PageHeader
            title="Configure the stream"
            description="The task is funded. One deposit funds every recipient below in parallel."
          />
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
          <button onClick={configure} disabled={busy} className="btn-primary w-full">
            {cadenceOverride ? 'Configure anyway' : 'Configure and open'}
          </button>
        </section>
      )}
    </div>
  );
}
