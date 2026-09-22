import type { ControlReason } from '@board/shared';
import { ratePerSecond } from '@board/shared';
import { type Clock, systemClock } from './clock.js';
import {
  type BuildDepositParams,
  type DepositRef,
  type StartStreamsParams,
  type StreamProvider,
  type StreamRef,
  type StreamStatus,
  type TxRef,
  type UnsignedTransaction,
  StreamProviderError,
  asDepositRef,
  asStreamRef,
  asTxRef,
} from './types.js';

interface MockDeposit {
  ref: DepositRef;
  txId: string;
  amount: bigint;
  /** Unallocated balance. Guards against over-committing a single deposit. */
  available: bigint;
  funder: string;
  confirmed: boolean;
}

interface MockStream {
  ref: StreamRef;
  depositRef: DepositRef;
  recipient: string;
  amount: bigint;
  rate: bigint;
  startedAt: number;
  endsAt: number;
  state: 'active' | 'paused' | 'stopped' | 'completed';
  /** Micro-units delivered before the current active span began. */
  accruedBefore: bigint;
  /** Start of the current active span; null while paused or stopped. */
  activeSince: number | null;
  stoppedReason: ControlReason | null;
}

/**
 * In-memory, time-simulated StackStream stand-in.
 *
 * Exists so the entire product can be built, tested and demoed before the real
 * integration shape is settled with the StackStream team (README > Open
 * questions). Behaviour it deliberately mirrors:
 *
 *   - Streamed funds are final. Stopping halts FUTURE disbursement only;
 *     `disbursed` never decreases.
 *   - One deposit funds N parallel streams, and cannot be over-committed.
 *   - Pausing freezes accrual and pushes `endsAt` out by the paused duration,
 *     so a resumed stream still delivers its full amount.
 */
export class MockStreamProvider implements StreamProvider {
  readonly name = 'mock';

  private deposits = new Map<string, MockDeposit>();
  private streams = new Map<string, MockStream>();
  private seq = 0;

  constructor(private clock: Clock = systemClock) {}

  async buildDeposit(params: BuildDepositParams): Promise<UnsignedTransaction> {
    if (params.amount <= 0n) {
      throw new StreamProviderError('Deposit amount must be positive', 'INVALID_AMOUNT');
    }
    const txId = `0x${(this.seq++).toString(16).padStart(64, '0')}`;
    this.deposits.set(txId, {
      ref: asDepositRef(`dep_${txId.slice(2, 10)}`),
      txId,
      amount: params.amount,
      available: params.amount,
      funder: params.funder,
      confirmed: false,
    });
    return {
      kind: 'contract-call',
      payload: { function: 'deposit', amount: params.amount.toString(), memo: params.memo, txId },
      summary: `Deposit ${params.amount} micro-units to StackStream for ${params.memo}`,
    };
  }

  async confirmDeposit(txId: string): Promise<DepositRef | null> {
    const d = this.deposits.get(txId);
    if (!d) return null;
    d.confirmed = true;
    return d.ref;
  }

  async startStreams(params: StartStreamsParams): Promise<StreamRef[]> {
    const deposit = this.findDeposit(params.depositRef);
    if (!deposit.confirmed) {
      throw new StreamProviderError('Deposit is not confirmed', 'DEPOSIT_UNCONFIRMED');
    }
    if (params.recipients.length === 0) {
      throw new StreamProviderError('At least one recipient is required', 'NO_RECIPIENTS');
    }

    const total = params.recipients.reduce((s, r) => s + r.amount, 0n);
    if (total > deposit.available) {
      throw new StreamProviderError(
        `Allocations total ${total} but only ${deposit.available} remains on this deposit`,
        'INSUFFICIENT_DEPOSIT',
      );
    }

    const now = this.clock.now();
    const refs: StreamRef[] = [];
    for (const r of params.recipients) {
      const ref = asStreamRef(`str_${this.seq++}`);
      this.streams.set(ref, {
        ref,
        depositRef: deposit.ref,
        recipient: r.address,
        amount: r.amount,
        rate: ratePerSecond(r.amount, params.durationSeconds),
        startedAt: now,
        endsAt: now + params.durationSeconds,
        state: 'active',
        accruedBefore: 0n,
        activeSince: now,
        stoppedReason: null,
      });
      refs.push(ref);
    }
    deposit.available -= total;
    return refs;
  }

  async pauseStream(ref: StreamRef, _reason: ControlReason): Promise<TxRef> {
    const s = this.mustFind(ref);
    this.settle(s);
    if (s.state !== 'active') {
      throw new StreamProviderError(`Cannot pause a ${s.state} stream`, 'INVALID_STATE');
    }
    s.accruedBefore = this.accrued(s);
    s.activeSince = null;
    s.state = 'paused';
    return asTxRef(`tx_pause_${this.seq++}`);
  }

  async resumeStream(ref: StreamRef): Promise<TxRef> {
    const s = this.mustFind(ref);
    if (s.state !== 'paused') {
      throw new StreamProviderError(`Cannot resume a ${s.state} stream`, 'INVALID_STATE');
    }
    const now = this.clock.now();
    // Push the end out so a resumed stream still delivers its full amount.
    const remaining = s.amount - s.accruedBefore;
    s.endsAt = s.rate > 0n ? now + Number(remaining / s.rate) : now;
    s.activeSince = now;
    s.state = 'active';
    return asTxRef(`tx_resume_${this.seq++}`);
  }

  async stopStream(ref: StreamRef, reason: ControlReason): Promise<TxRef> {
    const s = this.mustFind(ref);
    this.settle(s);
    if (s.state === 'stopped' || s.state === 'completed') {
      throw new StreamProviderError(`Stream is already ${s.state}`, 'INVALID_STATE');
    }
    // Streamed funds are final: freeze what was delivered, release the rest.
    s.accruedBefore = this.accrued(s);
    s.activeSince = null;
    s.state = 'stopped';
    s.stoppedReason = reason;
    const unstreamed = s.amount - s.accruedBefore;
    const deposit = this.findDeposit(s.depositRef);
    deposit.available += unstreamed;
    return asTxRef(`tx_stop_${this.seq++}`);
  }

  async getStreamStatus(ref: StreamRef): Promise<StreamStatus> {
    const s = this.mustFind(ref);
    this.settle(s);
    const disbursed = this.accrued(s);
    return {
      ref: s.ref,
      state: s.state,
      disbursed,
      remaining: s.amount - disbursed,
      ratePerSecond: s.rate,
      startedAt: s.startedAt,
      endsAt: s.endsAt,
    };
  }

  /** Unstreamed balance still sitting with the funder on StackStream. */
  async getDepositAvailable(ref: DepositRef): Promise<bigint> {
    return this.findDeposit(ref).available;
  }

  /** Transitions a stream that has reached term. Idempotent. */
  private settle(s: MockStream): void {
    if (s.state === 'active' && this.clock.now() >= s.endsAt) {
      s.accruedBefore = s.amount;
      s.activeSince = null;
      s.state = 'completed';
    }
  }

  private accrued(s: MockStream): bigint {
    if (s.activeSince === null) return s.accruedBefore;
    const elapsed = BigInt(Math.max(0, this.clock.now() - s.activeSince));
    const total = s.accruedBefore + elapsed * s.rate;
    return total > s.amount ? s.amount : total;
  }

  private mustFind(ref: StreamRef): MockStream {
    const s = this.streams.get(ref);
    if (!s) throw new StreamProviderError(`Unknown stream ${ref}`, 'NOT_FOUND');
    return s;
  }

  private findDeposit(ref: DepositRef): MockDeposit {
    for (const d of this.deposits.values()) if (d.ref === ref) return d;
    throw new StreamProviderError(`Unknown deposit ${ref}`, 'NOT_FOUND');
  }
}
