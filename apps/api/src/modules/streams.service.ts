import type { ControlReason } from '@board/shared';
import { assertParticipantTransition } from '@board/shared';
import { asStreamRef, type StreamProvider } from '@board/provider';
import type { Db } from '../lib/prisma.js';
import { writeAudit } from '../lib/audit.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { fromBigInt, toBigInt } from '../lib/amount.js';

export class StreamService {
  constructor(
    private db: Db,
    private provider: StreamProvider,
    private cooloffDays: number,
  ) {}

  /**
   * Starts every selected participant's stream from the task's single deposit,
   * in one provider call. A bounty is the one-element case of a cohort.
   */
  async startForTask(taskId: string, actorId: string) {
    const task = await this.db.task.findUnique({
      where: { id: taskId },
      include: { participants: { where: { status: 'selected' }, include: { stream: true } } },
    });
    if (!task) throw notFound('Task not found');
    if (!task.depositRef) throw conflict('Task has no confirmed deposit', 'NO_DEPOSIT');
    if (!task.durationSeconds) throw conflict('Task is not configured', 'NOT_CONFIGURED');

    const pending = task.participants.filter((p) => !p.stream);
    if (pending.length === 0) throw conflict('No participants awaiting a stream', 'NOTHING_TO_START');

    const refs = await this.provider.startStreams({
      depositRef: task.depositRef as never,
      durationSeconds: task.durationSeconds,
      recipients: pending.map((p) => ({
        address: p.recipientAddress,
        amount: toBigInt(p.allocationAmount),
      })),
    });

    const now = new Date();
    const endsAt = new Date(now.getTime() + task.durationSeconds * 1000);

    return this.db.$transaction(async (tx) => {
      const created = [];
      for (const [i, p] of pending.entries()) {
        const ref = refs[i]!;
        const status = await this.provider.getStreamStatus(ref);
        const stream = await tx.stream.create({
          data: {
            taskId: task.id,
            participantId: p.id,
            providerRef: ref,
            recipientAddress: p.recipientAddress,
            amount: p.allocationAmount,
            ratePerSecond: fromBigInt(status.ratePerSecond),
            state: 'active',
            startedAt: now,
            endsAt,
          },
        });
        await tx.streamEvent.create({ data: { streamId: stream.id, kind: 'started' } });
        assertParticipantTransition(p.status as never, 'active');
        await tx.participant.update({ where: { id: p.id }, data: { status: 'active' } });
        await writeAudit(tx, {
          actorId,
          entityType: 'stream',
          entityId: stream.id,
          action: 'started',
          after: { providerRef: ref, amount: p.allocationAmount },
        });
        created.push(stream);
      }
      await tx.task.update({
        where: { id: task.id },
        data: { status: 'ACTIVE', startedAt: task.startedAt ?? now },
      });
      return created;
    });
  }

  /**
   * Pause is a funder-side cooling-off action on a bounty, never a committee
   * action — a flag does not pause a stream. It is time-boxed: the auto-resume
   * job releases it after the cool-off window, so a funder cannot freeze a
   * builder's stream indefinitely (README > Dispute handling).
   */
  async pause(streamId: string, actor: { id: string }, reason: string) {
    const stream = await this.mustFind(streamId);
    await this.assertFunder(stream.taskId, actor.id);
    if (stream.state !== 'active') throw conflict(`Stream is ${stream.state}`, 'INVALID_STATE');

    const txRef = await this.provider.pauseStream(asStreamRef(stream.providerRef), 'funder_pause');
    const resumesAt = new Date(Date.now() + this.cooloffDays * 86_400_000);

    await this.db.$transaction(async (tx) => {
      await tx.stream.update({
        where: { id: stream.id },
        data: { state: 'paused', pausedAt: new Date() },
      });
      await tx.streamEvent.create({
        data: { streamId: stream.id, kind: 'paused', reason, txId: txRef },
      });
      await writeAudit(tx, {
        actorId: actor.id,
        entityType: 'stream',
        entityId: stream.id,
        action: 'paused',
        before: { state: 'active' },
        after: { state: 'paused', autoResumesAt: resumesAt.toISOString() },
        reason,
        txRef,
      });
    });

    return { state: 'paused' as const, autoResumesAt: resumesAt };
  }

  async resume(streamId: string, actorId: string | null, reason: ControlReason = 'funder_pause') {
    const stream = await this.mustFind(streamId);
    if (stream.state !== 'paused') throw conflict(`Stream is ${stream.state}`, 'INVALID_STATE');

    const txRef = await this.provider.resumeStream(asStreamRef(stream.providerRef));
    const status = await this.provider.getStreamStatus(asStreamRef(stream.providerRef));

    await this.db.$transaction(async (tx) => {
      await tx.stream.update({
        where: { id: stream.id },
        data: { state: 'active', pausedAt: null, endsAt: new Date(status.endsAt * 1000) },
      });
      await tx.streamEvent.create({ data: { streamId: stream.id, kind: 'resumed', txId: txRef } });
      await writeAudit(tx, {
        actorId,
        entityType: 'stream',
        entityId: stream.id,
        action: 'resumed',
        after: { state: 'active', endsAt: new Date(status.endsAt * 1000).toISOString() },
        reason,
        txRef,
      });
    });

    return { state: 'active' as const };
  }

  /**
   * Stops a stream. Streamed funds are final: this halts FUTURE disbursement
   * only, and the unstreamed remainder stays with the funder on StackStream.
   */
  async stop(streamId: string, actorId: string | null, reason: ControlReason, note: string) {
    const stream = await this.mustFind(streamId);
    if (stream.state === 'stopped' || stream.state === 'completed') {
      throw conflict(`Stream is already ${stream.state}`, 'INVALID_STATE');
    }

    const txRef = await this.provider.stopStream(asStreamRef(stream.providerRef), reason);
    const status = await this.provider.getStreamStatus(asStreamRef(stream.providerRef));
    const disbursed = fromBigInt(status.disbursed);

    await this.db.$transaction(async (tx) => {
      await tx.stream.update({
        where: { id: stream.id },
        data: { state: 'stopped', disbursed, lastSyncedAt: new Date() },
      });
      await tx.streamEvent.create({
        data: {
          streamId: stream.id,
          kind: 'stopped',
          reason: note,
          txId: txRef,
          disbursedAtEvent: disbursed,
        },
      });
      await writeAudit(tx, {
        actorId,
        entityType: 'stream',
        entityId: stream.id,
        action: 'stopped',
        before: { state: stream.state },
        // Recorded publicly: a funder who routinely stops late builds a history.
        after: {
          state: 'stopped',
          disbursed,
          percentStreamed: percentOf(status.disbursed, toBigInt(stream.amount)),
        },
        reason: note,
        txRef,
      });
    });

    return { state: 'stopped' as const, disbursed };
  }

  /** The DB is a cache of chain truth; this is what re-derives it. */
  async reconcile(streamId: string) {
    const stream = await this.mustFind(streamId);
    const status = await this.provider.getStreamStatus(asStreamRef(stream.providerRef));
    const disbursed = fromBigInt(status.disbursed);

    if (stream.state !== status.state || stream.disbursed !== disbursed) {
      await this.db.$transaction(async (tx) => {
        await tx.stream.update({
          where: { id: stream.id },
          data: { state: status.state, disbursed, lastSyncedAt: new Date() },
        });
        if (status.state === 'completed' && stream.state !== 'completed') {
          await tx.streamEvent.create({
            data: { streamId: stream.id, kind: 'completed', disbursedAtEvent: disbursed },
          });
          await tx.participant.update({
            where: { id: stream.participantId },
            data: { status: 'completed', exitedAt: new Date() },
          });
        }
      });
    }

    return { ...status, disbursed: fromBigInt(status.disbursed), remaining: fromBigInt(status.remaining) };
  }

  async status(streamId: string) {
    return this.reconcile(streamId);
  }

  private async mustFind(streamId: string) {
    const s = await this.db.stream.findUnique({ where: { id: streamId } });
    if (!s) throw notFound('Stream not found');
    return s;
  }

  private async assertFunder(taskId: string, userId: string) {
    const task = await this.db.task.findUnique({ where: { id: taskId } });
    if (task?.funderId !== userId) throw forbidden('Only the funder can control this stream');
  }
}

function percentOf(part: bigint, whole: bigint): number {
  if (whole === 0n) return 0;
  return Number((part * 10_000n) / whole) / 100;
}
