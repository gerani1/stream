import { describe, it, expect, beforeEach } from 'vitest';
import { MockStreamProvider, ManualClock, StreamProviderError, type DepositRef } from '../src/index.js';

const DAY = 86_400;

async function fund(p: MockStreamProvider, amount: bigint): Promise<DepositRef> {
  const tx = await p.buildDeposit({ amount, token: { kind: 'stx' }, funder: 'SPFUNDER', memo: 't1' });
  const ref = await p.confirmDeposit(tx.payload.txId as string);
  return ref!;
}

describe('MockStreamProvider', () => {
  let clock: ManualClock;
  let p: MockStreamProvider;

  beforeEach(() => {
    clock = new ManualClock(1_000_000);
    p = new MockStreamProvider(clock);
  });

  it('accrues linearly over the duration', async () => {
    const dep = await fund(p, 86_400n);
    const [ref] = await p.startStreams({
      depositRef: dep,
      durationSeconds: DAY,
      recipients: [{ address: 'SPBUILDER', amount: 86_400n }],
    });
    clock.advance(DAY / 4);
    const s = await p.getStreamStatus(ref!);
    expect(s.disbursed).toBe(21_600n);
    expect(s.remaining).toBe(64_800n);
    expect(s.state).toBe('active');
  });

  it('completes on its own at term', async () => {
    const dep = await fund(p, 86_400n);
    const [ref] = await p.startStreams({
      depositRef: dep,
      durationSeconds: DAY,
      recipients: [{ address: 'SPBUILDER', amount: 86_400n }],
    });
    clock.advance(DAY + 60);
    const s = await p.getStreamStatus(ref!);
    expect(s.state).toBe('completed');
    expect(s.disbursed).toBe(86_400n);
    expect(s.remaining).toBe(0n);
  });

  it('funds five parallel streams from ONE deposit', async () => {
    const dep = await fund(p, 500n * 86_400n);
    const recipients = ['A', 'B', 'C', 'D', 'E'].map((a) => ({
      address: `SP${a}`,
      amount: 100n * 86_400n,
    }));
    const refs = await p.startStreams({ depositRef: dep, durationSeconds: DAY, recipients });
    expect(refs).toHaveLength(5);
    clock.advance(DAY / 2);
    for (const r of refs) {
      expect((await p.getStreamStatus(r)).disbursed).toBe(50n * 86_400n);
    }
  });

  it('refuses to over-commit a single deposit', async () => {
    const dep = await fund(p, 100n);
    await expect(
      p.startStreams({
        depositRef: dep,
        durationSeconds: DAY,
        recipients: [
          { address: 'SPA', amount: 60n },
          { address: 'SPB', amount: 60n },
        ],
      }),
    ).rejects.toThrow(/only 100 remains/);
  });

  it('freezes accrual while paused and still delivers in full on resume', async () => {
    const dep = await fund(p, 86_400n);
    const [ref] = await p.startStreams({
      depositRef: dep,
      durationSeconds: DAY,
      recipients: [{ address: 'SPBUILDER', amount: 86_400n }],
    });
    clock.advance(DAY / 4);
    await p.pauseStream(ref!, 'funder_pause');

    clock.advance(DAY * 3);
    const paused = await p.getStreamStatus(ref!);
    expect(paused.state).toBe('paused');
    expect(paused.disbursed).toBe(21_600n); // unchanged across three days

    await p.resumeStream(ref!);
    clock.advance(DAY); // the remaining three-quarters, plus slack
    const done = await p.getStreamStatus(ref!);
    expect(done.disbursed).toBe(86_400n);
  });

  it('makes streamed funds final on stop, and returns only the remainder', async () => {
    const dep = await fund(p, 86_400n);
    const [ref] = await p.startStreams({
      depositRef: dep,
      durationSeconds: DAY,
      recipients: [{ address: 'SPBUILDER', amount: 86_400n }],
    });
    clock.advance(DAY / 4);
    await p.stopStream(ref!, 'committee_drop');

    clock.advance(DAY * 10);
    const s = await p.getStreamStatus(ref!);
    expect(s.state).toBe('stopped');
    expect(s.disbursed).toBe(21_600n); // never decreases, never grows
    expect(await p.getDepositAvailable(dep)).toBe(64_800n);
  });

  it('stopping one recipient does not touch the others', async () => {
    const dep = await fund(p, 3n * 86_400n);
    const refs = await p.startStreams({
      depositRef: dep,
      durationSeconds: DAY,
      recipients: [
        { address: 'SPA', amount: 86_400n },
        { address: 'SPB', amount: 86_400n },
        { address: 'SPC', amount: 86_400n },
      ],
    });
    clock.advance(DAY / 2);
    await p.stopStream(refs[1]!, 'committee_drop');
    clock.advance(DAY / 2);

    expect((await p.getStreamStatus(refs[0]!)).state).toBe('completed');
    expect((await p.getStreamStatus(refs[1]!)).state).toBe('stopped');
    expect((await p.getStreamStatus(refs[1]!)).disbursed).toBe(43_200n);
    expect((await p.getStreamStatus(refs[2]!)).state).toBe('completed');
  });

  it('rejects starting streams from an unconfirmed deposit', async () => {
    const p2 = new MockStreamProvider(clock);
    const tx = await p2.buildDeposit({
      amount: 100n,
      token: { kind: 'stx' },
      funder: 'SPF',
      memo: 't',
    });
    // Deliberately skip confirmDeposit.
    await expect(
      p2.startStreams({
        depositRef: `dep_${(tx.payload.txId as string).slice(2, 10)}` as DepositRef,
        durationSeconds: DAY,
        recipients: [{ address: 'SPA', amount: 100n }],
      }),
    ).rejects.toThrow(StreamProviderError);
  });

  it('refuses to stop an already-stopped stream', async () => {
    const dep = await fund(p, 86_400n);
    const [ref] = await p.startStreams({
      depositRef: dep,
      durationSeconds: DAY,
      recipients: [{ address: 'SPA', amount: 86_400n }],
    });
    await p.stopStream(ref!, 'funder_cancel');
    await expect(p.stopStream(ref!, 'funder_cancel')).rejects.toThrow(/already stopped/);
  });
});
