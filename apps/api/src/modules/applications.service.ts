import type { ApplyInput } from '@board/shared';
import { splitEvenly, validateCustomSplit } from '@board/shared';
import type { Db } from '../lib/prisma.js';
import { writeAudit } from '../lib/audit.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { fromBigInt, toBigInt } from '../lib/amount.js';

export class ApplicationService {
  constructor(private db: Db) {}

  async apply(taskId: string, userId: string, input: ApplyInput) {
    const task = await this.db.task.findUnique({ where: { id: taskId } });
    if (!task) throw notFound('Task not found');
    if (task.status !== 'OPEN') throw conflict(`Task is ${task.status}, not open`, 'NOT_OPEN');
    if (task.funderId === userId) throw forbidden('A funder cannot apply to their own task');

    const existing = await this.db.application.findUnique({
      where: { taskId_userId: { taskId, userId } },
    });
    if (existing) throw conflict('Already applied', 'DUPLICATE_APPLICATION');

    return this.db.application.create({
      data: {
        taskId,
        userId,
        proposal: input.proposal,
        productUrl: input.productUrl ?? null,
        currentTraction: input.currentTraction ?? undefined,
      },
    });
  }

  async list(taskId: string, requesterId: string) {
    const task = await this.db.task.findUnique({ where: { id: taskId } });
    if (!task) throw notFound('Task not found');
    if (task.funderId !== requesterId) throw forbidden('Only the funder can see applicants');
    return this.db.application.findMany({
      where: { taskId },
      include: { user: { select: { stacksAddress: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Selects applicants and fixes their allocations. Streams are not started
   * here — that is a separate, explicit step so selection and the on-chain
   * action can be retried independently if one fails.
   */
  async select(params: {
    taskId: string;
    funderId: string;
    applicationIds: string[];
    allocation: { model: 'even' } | { model: 'custom'; amounts: Record<string, string> };
  }) {
    const task = await this.db.task.findUnique({ where: { id: params.taskId } });
    if (!task) throw notFound('Task not found');
    if (task.funderId !== params.funderId) throw forbidden('Only the funder can select');
    if (task.status !== 'OPEN') throw conflict(`Task is ${task.status}`, 'NOT_OPEN');
    if (task.type === 'bounty' && params.applicationIds.length !== 1) {
      throw badRequest('A bounty selects exactly one builder', 'BOUNTY_SINGLE_RECIPIENT');
    }

    const apps = await this.db.application.findMany({
      where: { id: { in: params.applicationIds }, taskId: params.taskId },
      include: { user: true },
    });
    if (apps.length !== params.applicationIds.length) throw notFound('Unknown application');

    const total = toBigInt(task.totalAmount);
    const allocations =
      params.allocation.model === 'even'
        ? splitEvenly(total, apps.map((a) => a.user.stacksAddress))
        : validateCustomSplit(
            total,
            apps.map((a) => ({
              address: a.user.stacksAddress,
              amount: toBigInt(params.allocation.model === 'custom' ? params.allocation.amounts[a.id] ?? '0' : '0'),
            })),
          );

    const byAddress = new Map(allocations.map((a) => [a.address, a.amount]));

    return this.db.$transaction(async (tx) => {
      const participants = [];
      for (const app of apps) {
        const amount = byAddress.get(app.user.stacksAddress)!;
        const p = await tx.participant.create({
          data: {
            taskId: params.taskId,
            userId: app.userId,
            role: task.type === 'cohort' ? 'project' : 'builder',
            allocationAmount: fromBigInt(amount),
            recipientAddress: app.user.stacksAddress,
            status: 'selected',
          },
        });
        await tx.application.update({ where: { id: app.id }, data: { status: 'selected' } });
        await writeAudit(tx, {
          actorId: params.funderId,
          entityType: 'application',
          entityId: app.id,
          action: 'selected',
          after: { participantId: p.id, allocationAmount: fromBigInt(amount) },
        });
        participants.push(p);
      }
      await tx.application.updateMany({
        where: { taskId: params.taskId, status: 'pending', id: { notIn: params.applicationIds } },
        data: { status: 'rejected' },
      });
      return participants;
    });
  }
}
