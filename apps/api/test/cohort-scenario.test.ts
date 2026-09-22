import { describe, it, expect } from 'vitest';
import { MockStreamProvider, ManualClock, type StreamRef } from '@board/provider';
import { ratePerSecond, resolveReview, splitEvenly, type ParticipantStatus } from '@board/shared';

/**
 * End-to-end rehearsal of the worked example in the README: five projects enter
 * a 12-week cohort funded by ONE deposit, three graduate on a full stream, two
 * are cut by committee vote after failing to recover within their grace cycle.
 *
 * This exercises the domain rules and the stream provider together, with no
 * database — it is the cheapest possible check that the two-strike mechanism
 * and the stream lifecycle actually agree with each other.
 */
const DAY = 86_400;
const WEEK = 7 * DAY;
const PROGRAM = 12 * WEEK;
const PER_PROJECT = 1_200_000_000n; // 1,200 units in micro-units
const POOL = PER_PROJECT * 5n;

// Per-second rate truncates, so a stream stopped mid-flight delivers slightly
// less than the ideal pro-rata share. A stream that runs to term is topped up
// to its full amount on completion, so only stopped streams carry the dust.
const RATE = ratePerSecond(PER_PROJECT, PROGRAM);
const streamedOver = (seconds: number) => RATE * BigInt(seconds);

type Trajectory = 'growing' | 'flat';

/** Committee of three. Everyone votes the same way for a clean scenario. */
const voteAll = (value: 'continue' | 'flag' | 'drop') =>
  ['c1', 'c2', 'c3'].map((memberId) => ({ memberId, value }));

describe('cohort worked example: 5 products, 3 survivors', () => {
  it('streams one deposit to five wallets and enforces two-strike drops', async () => {
    const clock = new ManualClock(0);
    const provider = new MockStreamProvider(clock);

    // ---- one deposit funds five parallel streams ----
    const tx = await provider.buildDeposit({
      amount: POOL,
      token: { kind: 'stx' },
      funder: 'SPFUNDER',
      memo: 'task:cohort-1',
    });
    const deposit = await provider.confirmDeposit(tx.payload.txId as string);
    expect(deposit).not.toBeNull();

    const addresses = ['SPA', 'SPB', 'SPC', 'SPD', 'SPE'];
    const allocations = splitEvenly(POOL, addresses);
    expect(allocations.every((a) => a.amount === PER_PROJECT)).toBe(true);

    const refs = await provider.startStreams({
      depositRef: deposit!,
      durationSeconds: PROGRAM,
      recipients: allocations,
    });
    expect(refs).toHaveLength(5);

    const state = new Map<string, { ref: StreamRef; status: ParticipantStatus }>(
      addresses.map((a, i) => [a, { ref: refs[i]!, status: 'active' as ParticipantStatus }]),
    );

    // Trajectory per project, per biweekly review (6 cycles over 12 weeks).
    // D is flat from the start; C goes flat midway; B has one bad cycle and recovers.
    const trajectories: Record<string, Trajectory[]> = {
      SPA: ['growing', 'growing', 'growing', 'growing', 'growing', 'growing'],
      SPB: ['growing', 'flat', 'growing', 'growing', 'growing', 'growing'],
      SPC: ['growing', 'growing', 'growing', 'flat', 'flat', 'growing'],
      SPD: ['flat', 'flat', 'growing', 'growing', 'growing', 'growing'],
      SPE: ['growing', 'growing', 'growing', 'growing', 'growing', 'growing'],
    };

    const dropped: Record<string, number> = {};

    for (let cycle = 0; cycle < 6; cycle++) {
      clock.advance(2 * WEEK); // biweekly review

      for (const address of addresses) {
        const entry = state.get(address)!;
        if (entry.status === 'dropped' || entry.status === 'completed') continue;

        const trajectory = trajectories[address]![cycle]!;
        const votes = voteAll(trajectory === 'growing' ? 'continue' : 'drop');

        const decision = resolveReview({
          current: entry.status as 'active' | 'flagged',
          votes,
        });
        entry.status = decision.nextStatus;

        if (decision.stopStream) {
          await provider.stopStream(entry.ref, 'committee_drop');
          dropped[address] = cycle + 1;
        }
      }
    }

    // ---- outcomes ----
    // D was flat at cycles 1 and 2: flagged at 1, dropped at 2 (week 4).
    expect(dropped.SPD).toBe(2);
    // C was flat at cycles 4 and 5: flagged at 4, dropped at 5 (week 10).
    expect(dropped.SPC).toBe(5);
    // B had one flat cycle then recovered — never dropped.
    expect(dropped.SPB).toBeUndefined();
    expect(state.get('SPB')!.status).toBe('active');

    const graduates = ['SPA', 'SPB', 'SPE'];
    for (const g of graduates) {
      const s = await provider.getStreamStatus(state.get(g)!.ref);
      expect(s.state).toBe('completed');
      expect(s.disbursed).toBe(PER_PROJECT);
    }

    // Dropped projects keep what already streamed; only the remainder is released.
    const d = await provider.getStreamStatus(state.get('SPD')!.ref);
    expect(d.state).toBe('stopped');
    expect(d.disbursed).toBe(streamedOver(4 * WEEK)); // 4 of 12 weeks
    expect(d.disbursed).toBeLessThan(PER_PROJECT / 3n); // truncation dust
    expect(d.disbursed).toBeGreaterThan(0n);

    const c = await provider.getStreamStatus(state.get('SPC')!.ref);
    expect(c.state).toBe('stopped');
    expect(c.disbursed).toBe(streamedOver(10 * WEEK)); // 10 of 12 weeks

    // Unstreamed remainder is back on the deposit, available to the funder.
    const unstreamed = await provider.getDepositAvailable(deposit!);
    expect(unstreamed).toBe(PER_PROJECT - d.disbursed + (PER_PROJECT - c.disbursed));
  });

  it('a flag alone never interrupts a stream', async () => {
    const clock = new ManualClock(0);
    const provider = new MockStreamProvider(clock);
    const tx = await provider.buildDeposit({
      amount: PER_PROJECT,
      token: { kind: 'stx' },
      funder: 'SPF',
      memo: 'task:t',
    });
    const deposit = await provider.confirmDeposit(tx.payload.txId as string);
    const [ref] = await provider.startStreams({
      depositRef: deposit!,
      durationSeconds: PROGRAM,
      recipients: [{ address: 'SPX', amount: PER_PROJECT }],
    });

    clock.advance(2 * WEEK);
    const flagged = resolveReview({ current: 'active', votes: voteAll('drop') });
    expect(flagged.nextStatus).toBe('flagged');
    expect(flagged.stopStream).toBe(false);

    clock.advance(2 * WEEK);
    const s = await provider.getStreamStatus(ref!);
    // Four of twelve weeks streamed, uninterrupted by the flag.
    expect(s.state).toBe('active');
    expect(s.disbursed).toBe(streamedOver(4 * WEEK));
  });
});
