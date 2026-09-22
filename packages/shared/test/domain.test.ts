import { describe, it, expect } from 'vitest';
import {
  splitEvenly,
  validateCustomSplit,
  AllocationError,
  ratePerSecond,
  resolveReview,
  QuorumError,
  assessCadence,
  canTransitionTask,
  assertParticipantTransition,
  InvalidTransitionError,
} from '../src/index.js';

describe('allocation — one deposit, many streams', () => {
  it('splits evenly across recipients', () => {
    const out = splitEvenly(300_000_000n, ['SP1', 'SP2', 'SP3']);
    expect(out.map((a) => a.amount)).toEqual([100_000_000n, 100_000_000n, 100_000_000n]);
  });

  it('distributes the remainder so allocations sum to exactly the total', () => {
    const total = 1_000_000n + 2n;
    const out = splitEvenly(total, ['SP1', 'SP2', 'SP3', 'SP4', 'SP5']);
    expect(out.reduce((s, a) => s + a.amount, 0n)).toBe(total);
    // Remainder of 2 goes one micro-unit each to the first two recipients.
    expect(out[0]!.amount - out[4]!.amount).toBe(1n);
  });

  it('rejects duplicate recipients', () => {
    expect(() => splitEvenly(100n, ['SP1', 'SP1'])).toThrow(AllocationError);
  });

  it('rejects a custom split that does not sum to the deposit', () => {
    expect(() =>
      validateCustomSplit(1000n, [
        { address: 'SP1', amount: 400n },
        { address: 'SP2', amount: 500n },
      ]),
    ).toThrow(/sum to 900, expected exactly 1000/);
  });

  it('accepts an exact custom split', () => {
    const out = validateCustomSplit(1000n, [
      { address: 'SP1', amount: 400n },
      { address: 'SP2', amount: 600n },
    ]);
    expect(out).toHaveLength(2);
  });

  it('computes a per-second rate', () => {
    expect(ratePerSecond(86_400n, 86_400)).toBe(1n);
  });
});

describe('two-strike review', () => {
  const votes = (...vals: Array<'continue' | 'flag' | 'drop'>) =>
    vals.map((value, i) => ({ memberId: `m${i}`, value }));

  it('never drops an active participant outright — the first bad review flags', () => {
    const r = resolveReview({ current: 'active', votes: votes('drop', 'drop', 'drop') });
    expect(r.outcome).toBe('flagged');
    expect(r.nextStatus).toBe('flagged');
    expect(r.stopStream).toBe(false);
  });

  it('keeps an active participant on track when the committee is satisfied', () => {
    const r = resolveReview({ current: 'active', votes: votes('continue', 'continue', 'flag') });
    expect(r.outcome).toBe('on_track');
  });

  it('clears the flag when a flagged participant recovers', () => {
    const r = resolveReview({ current: 'flagged', votes: votes('continue', 'continue', 'continue') });
    expect(r.nextStatus).toBe('active');
    expect(r.stopStream).toBe(false);
  });

  it('drops a flagged participant that did not recover, and stops the stream', () => {
    const r = resolveReview({ current: 'flagged', votes: votes('drop', 'drop', 'continue') });
    expect(r.outcome).toBe('dropped');
    expect(r.stopStream).toBe(true);
  });

  it('does not stop the stream on a flag — a flag is a warning, not a penalty', () => {
    const r = resolveReview({ current: 'flagged', votes: votes('flag', 'flag', 'continue') });
    expect(r.nextStatus).toBe('flagged');
    expect(r.stopStream).toBe(false);
  });

  it('requires quorum', () => {
    expect(() => resolveReview({ current: 'active', votes: votes('drop', 'drop') })).toThrow(
      QuorumError,
    );
  });

  it('counts only the latest vote per member', () => {
    const cast = [
      { memberId: 'm1', value: 'drop' as const },
      { memberId: 'm1', value: 'continue' as const },
      { memberId: 'm2', value: 'continue' as const },
      { memberId: 'm3', value: 'continue' as const },
    ];
    expect(resolveReview({ current: 'flagged', votes: cast }).nextStatus).toBe('active');
  });
});

describe('cadence assessment', () => {
  const days = (n: number) => n * 86_400;

  it('warns that two-strike is decorative on a one-month biweekly program', () => {
    const a = assessCadence(days(30), 'biweekly');
    expect(a.cycles).toBe(2);
    expect(a.twoStrikeIsDecorative).toBe(true);
    expect(a.suggestedCadence).toBe('weekly');
  });

  it('is satisfied by a three-month biweekly program', () => {
    const a = assessCadence(days(90), 'biweekly');
    expect(a.cycles).toBe(6);
    expect(a.twoStrikeIsDecorative).toBe(false);
    expect(a.warning).toBeNull();
  });

  it('accepts a one-month weekly program', () => {
    expect(assessCadence(days(30), 'weekly').twoStrikeIsDecorative).toBe(false);
  });

  it('treats a bounty as a single review point with no warning', () => {
    expect(assessCadence(days(7), 'on_submission').warning).toBeNull();
  });
});

describe('lifecycle', () => {
  it('requires a deposit before a task can open', () => {
    expect(canTransitionTask('DRAFT', 'OPEN')).toBe(false);
    expect(canTransitionTask('DRAFT', 'FUNDING_PENDING')).toBe(true);
    expect(canTransitionTask('FUNDED', 'OPEN')).toBe(true);
  });

  it('treats COMPLETED and CANCELLED as terminal', () => {
    expect(canTransitionTask('COMPLETED', 'ACTIVE')).toBe(false);
    expect(canTransitionTask('CANCELLED', 'ACTIVE')).toBe(false);
  });

  it('rejects reviving a dropped participant', () => {
    expect(() => assertParticipantTransition('dropped', 'active')).toThrow(InvalidTransitionError);
  });
});
