import {
  DEFAULT_COMMITTEE_RULES,
  assertParticipantTransition,
  assertNoConflict,
  resolveReview,
  type CommitteeRules,
  type ReportInput,
  type VoteInput,
} from '@board/shared';
import type { Db } from '../lib/prisma.js';
import { writeAudit } from '../lib/audit.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import type { StreamService } from './streams.service.js';

export class ReviewService {
  constructor(
    private db: Db,
    private streams: StreamService,
    private rules: CommitteeRules = DEFAULT_COMMITTEE_RULES,
  ) {}

  async submitReport(participantId: string, userId: string, input: ReportInput) {
    const participant = await this.db.participant.findUnique({
      where: { id: participantId },
      include: { task: true },
    });
    if (!participant) throw notFound('Participant not found');
    if (participant.userId !== userId) throw forbidden('Only the participant can report');

    const cycle = await this.db.reviewCycle.findFirst({
      where: { taskId: participant.taskId, status: 'open' },
      orderBy: { sequence: 'desc' },
    });
    if (!cycle) throw conflict('No open review window', 'WINDOW_CLOSED');

    return this.db.report.upsert({
      where: { participantId_reviewCycleId: { participantId, reviewCycleId: cycle.id } },
      create: {
        participantId,
        reviewCycleId: cycle.id,
        periodStart: cycle.windowOpensAt,
        periodEnd: cycle.windowClosesAt,
        ...input,
        blockers: input.blockers ?? null,
      },
      update: { ...input, blockers: input.blockers ?? null, submittedAt: new Date() },
    });
  }

  /** Votes are append-only. A changed mind is a new row; the latest cast wins. */
  async castVote(cycleId: string, memberId: string, input: VoteInput) {
    const cycle = await this.db.reviewCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw notFound('Review cycle not found');
    if (cycle.status === 'finalized') throw conflict('Cycle already finalized', 'FINALIZED');

    const participant = await this.db.participant.findUnique({
      where: { id: input.participantId },
    });
    if (!participant) throw notFound('Participant not found');
    // A committee member may not vote on a project they are affiliated with.
    assertNoConflict(memberId, [participant.userId]);

    const review = await this.db.review.upsert({
      where: {
        reviewCycleId_participantId: { reviewCycleId: cycleId, participantId: input.participantId },
      },
      create: { reviewCycleId: cycleId, participantId: input.participantId, outcome: 'on_track' },
      update: {},
    });

    return this.db.vote.create({
      data: { reviewId: review.id, memberId, value: input.value, note: input.note ?? null },
    });
  }

  /**
   * Resolves every participant in the cycle and executes the outcome.
   *
   * Two-strike (README): an active participant can only be flagged, never
   * dropped outright; a flagged participant either recovers or is dropped. A
   * flag never touches the stream — the only stream action here is `stop`, on a
   * drop.
   */
  async finalize(cycleId: string, actorId: string) {
    const cycle = await this.db.reviewCycle.findUnique({
      where: { id: cycleId },
      include: {
        reviews: { include: { votes: true, participant: { include: { stream: true } } } },
      },
    });
    if (!cycle) throw notFound('Review cycle not found');
    if (cycle.status === 'finalized') throw conflict('Already finalized', 'FINALIZED');

    const outcomes = [];
    for (const review of cycle.reviews) {
      const p = review.participant;
      if (p.status !== 'active' && p.status !== 'flagged') continue;

      const decision = resolveReview({
        current: p.status as 'active' | 'flagged',
        votes: review.votes.map((v) => ({ memberId: v.memberId, value: v.value as never })),
        rules: this.rules,
      });

      assertParticipantTransition(p.status as never, decision.nextStatus);

      await this.db.$transaction(async (tx) => {
        await tx.review.update({
          where: { id: review.id },
          data: { outcome: decision.outcome, decidedAt: new Date() },
        });
        await tx.participant.update({
          where: { id: p.id },
          data: {
            status: decision.nextStatus,
            ...(decision.nextStatus === 'dropped' ? { exitedAt: new Date() } : {}),
          },
        });
        await writeAudit(tx, {
          actorId,
          entityType: 'participant',
          entityId: p.id,
          action: `review_${decision.outcome}`,
          before: { status: p.status },
          after: { status: decision.nextStatus, cycle: cycle.sequence },
          reason: review.rationale,
        });
      });

      if (decision.stopStream && p.stream) {
        await this.streams.stop(
          p.stream.id,
          actorId,
          'committee_drop',
          `Dropped by committee vote at review cycle ${cycle.sequence}`,
        );
      }

      outcomes.push({ participantId: p.id, ...decision });
    }

    await this.db.reviewCycle.update({ where: { id: cycleId }, data: { status: 'finalized' } });
    return outcomes;
  }
}
