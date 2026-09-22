/** Core domain vocabulary. Shared by API, web, and the StackStream adapter. */

export type StacksAddress = string;

/** A task is either a single-deliverable bounty or a multi-project cohort. */
export type TaskType = 'bounty' | 'cohort';

/**
 * Task lifecycle. See README > Task lifecycle.
 *
 * The deposit is what creates the task: DRAFT exists only client-side until a
 * deposit transaction is submitted. Terminal states are COMPLETED, DROPPED and
 * CANCELLED.
 */
export type TaskStatus =
  | 'DRAFT'
  | 'FUNDING_PENDING'
  | 'FUNDED'
  | 'OPEN'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export type ParticipantStatus =
  | 'applied'
  | 'selected'
  | 'active'
  | 'flagged'
  | 'dropped'
  | 'completed';

export type StreamState = 'active' | 'paused' | 'stopped' | 'completed';

/** Outcome of one committee review of one participant. */
export type ReviewOutcome = 'on_track' | 'flagged' | 'dropped';

/** A single committee member's vote within a review. */
export type VoteValue = 'continue' | 'flag' | 'drop';

export type Role = 'builder' | 'funder' | 'committee' | 'admin';

/**
 * Why a stream was paused or stopped. Recorded on the audit log and surfaced
 * publicly, because reputation is the enforcement mechanism in a non-custodial
 * design (README > Dispute handling).
 */
export type ControlReason =
  | 'funder_pause'
  | 'funder_cancel'
  | 'committee_drop'
  | 'cooloff_auto_resume'
  | 'natural_completion';

export type TokenId = { kind: 'stx' } | { kind: 'sbtc' } | { kind: 'sip010'; contract: string };

export interface Allocation {
  address: StacksAddress;
  /** Micro-units of the task token. */
  amount: bigint;
}
