import type { ControlReason } from '@board/shared';
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
} from './types.js';

export interface StackStreamConfig {
  apiUrl: string;
  apiKey: string;
  contractAddress: string;
}

/**
 * Real StackStream adapter.
 *
 * DELIBERATELY UNIMPLEMENTED. Every method throws until the integration shape is
 * settled with the StackStream team — specifically:
 *
 *   1. Integration shape: does the board call Clarity contracts directly, or
 *      request stream operations via StackStream's API on the funder's behalf?
 *   2. Stream authority: can a funder delegate stop authority to the board or a
 *      committee multisig at deposit time? Until answered, cohort drops are
 *      enforced by running the pool from a committee multisig (model C).
 *   3. Status exposure: are state/disbursed/remaining/rate readable directly,
 *      and are there Chainhook-compatible push events?
 *
 * Filling this in is the ONLY work blocked on those answers. Everything else in
 * the product runs against MockStreamProvider today.
 */
export class StackStreamProvider implements StreamProvider {
  readonly name = 'stackstream';

  constructor(private readonly config: StackStreamConfig) {}

  buildDeposit(_params: BuildDepositParams): Promise<UnsignedTransaction> {
    throw notReady('buildDeposit');
  }
  confirmDeposit(_txId: string): Promise<DepositRef | null> {
    throw notReady('confirmDeposit');
  }
  startStreams(_params: StartStreamsParams): Promise<StreamRef[]> {
    throw notReady('startStreams');
  }
  pauseStream(_ref: StreamRef, _reason: ControlReason): Promise<TxRef> {
    throw notReady('pauseStream');
  }
  resumeStream(_ref: StreamRef): Promise<TxRef> {
    throw notReady('resumeStream');
  }
  stopStream(_ref: StreamRef, _reason: ControlReason): Promise<TxRef> {
    throw notReady('stopStream');
  }
  getStreamStatus(_ref: StreamRef): Promise<StreamStatus> {
    throw notReady('getStreamStatus');
  }
}

function notReady(method: string): StreamProviderError {
  return new StreamProviderError(
    `StackStreamProvider.${method} is not implemented: the integration shape is unsettled. ` +
      `Run with STREAM_PROVIDER=mock until it is agreed. See README > Open questions.`,
    'NOT_IMPLEMENTED',
  );
}
