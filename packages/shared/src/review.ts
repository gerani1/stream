import type { ParticipantStatus, ReviewOutcome, VoteValue } from './types.js';

export interface CommitteeRules {
  /** Minimum votes cast for a review to be resolvable. */
  quorum: number;
  /** Fraction of cast votes required to drop, e.g. 0.5 for a simple majority. */
  dropThreshold: number;
}

export const DEFAULT_COMMITTEE_RULES: CommitteeRules = { quorum: 3, dropThreshold: 0.5 };

export interface CastVote {
  memberId: string;
  value: VoteValue;
}

export class QuorumError extends Error {
  constructor(readonly cast: number, readonly required: number) {
    super(`Quorum not met: ${cast} vote(s) cast, ${required} required`);
    this.name = 'QuorumError';
  }
}

/**
 * Resolves one review of one participant.
 *
 * The two-strike rule (README > Two-strike drop mechanism):
 *   - An `active` participant can only be flagged, never dropped outright. The
 *     first bad review is always a warning.
 *   - A `flagged` participant that recovers returns to `active`, clearing the
 *     flag.
 *   - A `flagged` participant that does not recover is eligible to be dropped,
 *     and only then does the drop vote count.
 *
 * A flag never pauses the stream. The only stream action a committee ever takes
 * is `stop`, on a drop.
 */
export function resolveReview(params: {
  current: ParticipantStatus;
  votes: readonly CastVote[];
  rules?: CommitteeRules;
}): { outcome: ReviewOutcome; nextStatus: ParticipantStatus; stopStream: boolean } {
  const rules = params.rules ?? DEFAULT_COMMITTEE_RULES;
  const votes = dedupeByMember(params.votes);

  if (votes.length < rules.quorum) throw new QuorumError(votes.length, rules.quorum);

  const drops = votes.filter((v) => v.value === 'drop').length;
  const flags = votes.filter((v) => v.value === 'flag').length;
  const wantsDrop = drops / votes.length > rules.dropThreshold;
  // A drop vote on an unflagged participant still registers concern, so it
  // counts toward flagging rather than being discarded.
  const wantsFlag = (flags + drops) / votes.length > rules.dropThreshold;

  if (params.current === 'active') {
    if (wantsFlag) return { outcome: 'flagged', nextStatus: 'flagged', stopStream: false };
    return { outcome: 'on_track', nextStatus: 'active', stopStream: false };
  }

  if (params.current === 'flagged') {
    if (wantsDrop) return { outcome: 'dropped', nextStatus: 'dropped', stopStream: true };
    if (wantsFlag) return { outcome: 'flagged', nextStatus: 'flagged', stopStream: false };
    return { outcome: 'on_track', nextStatus: 'active', stopStream: false };
  }

  throw new Error(`Participant in status "${params.current}" is not reviewable`);
}

/** Votes are append-only; a changed mind is a new row. Last cast wins. */
function dedupeByMember(votes: readonly CastVote[]): CastVote[] {
  const byMember = new Map<string, CastVote>();
  for (const v of votes) byMember.set(v.memberId, v);
  return [...byMember.values()];
}

/**
 * A committee member may not vote on a participant they are affiliated with
 * (README > Committee composition).
 */
export function assertNoConflict(memberId: string, affiliatedMemberIds: readonly string[]): void {
  if (affiliatedMemberIds.includes(memberId)) {
    throw new Error(`Committee member ${memberId} must recuse from this participant`);
  }
}
