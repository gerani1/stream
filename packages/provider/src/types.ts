import type { Allocation, ControlReason, StacksAddress, StreamState, TokenId } from '@board/shared';

export type DepositRef = string & { readonly __brand: 'DepositRef' };
export type StreamRef = string & { readonly __brand: 'StreamRef' };
export type TxRef = string & { readonly __brand: 'TxRef' };

export const asDepositRef = (s: string) => s as DepositRef;
export const asStreamRef = (s: string) => s as StreamRef;
export const asTxRef = (s: string) => s as TxRef;

export interface UnsignedTransaction {
  /** Opaque payload the web app hands to @stacks/connect for signing. */
  kind: 'contract-call' | 'stx-transfer' | 'ft-transfer';
  payload: Record<string, unknown>;
  /** Human-readable summary shown on the review-before-sign screen. */
  summary: string;
}

export interface StreamStatus {
  ref: StreamRef;
  state: StreamState;
  /** Micro-units already delivered to the recipient. Never decreases. */
  disbursed: bigint;
  remaining: bigint;
  ratePerSecond: bigint;
  startedAt: number;
  endsAt: number;
}

export interface BuildDepositParams {
  amount: bigint;
  token: TokenId;
  funder: StacksAddress;
  /** Links the on-chain deposit back to the board task that created it. */
  memo: string;
}

export interface StartStreamsParams {
  depositRef: DepositRef;
  durationSeconds: number;
  /** One deposit funds N parallel streams. A bounty is the one-element case. */
  recipients: readonly Allocation[];
}

/**
 * The single seam between the board and StackStream.
 *
 * Nothing else in the codebase knows whether a call is a Clarity contract call,
 * a REST request or a webhook. Swapping MockStreamProvider for the real adapter
 * is a one-line change in the composition root, which is what lets the whole
 * product be built before the integration shape is settled.
 *
 * See README > Adapter design.
 */
export interface StreamProvider {
  readonly name: string;

  /** Returns an unsigned tx; the funder signs client-side. The board never holds keys. */
  buildDeposit(params: BuildDepositParams): Promise<UnsignedTransaction>;

  /** Confirms a broadcast deposit and returns its ref. Resolves null until confirmed. */
  confirmDeposit(txId: string): Promise<DepositRef | null>;

  startStreams(params: StartStreamsParams): Promise<StreamRef[]>;

  pauseStream(ref: StreamRef, reason: ControlReason): Promise<TxRef>;
  resumeStream(ref: StreamRef): Promise<TxRef>;
  stopStream(ref: StreamRef, reason: ControlReason): Promise<TxRef>;

  getStreamStatus(ref: StreamRef): Promise<StreamStatus>;
}

export class StreamProviderError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'StreamProviderError';
  }
}
