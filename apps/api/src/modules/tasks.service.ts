import {
  assertTaskTransition,
  assessCadence,
  splitEvenly,
  validateCustomSplit,
  ratePerSecond,
  type Allocation,
  type ConfigureTaskInput,
  type CreateTaskInput,
  type TokenId,
} from '@board/shared';
import type { StreamProvider } from '@board/provider';
import { asDepositRef } from '@board/provider';
import type { Db } from '../lib/prisma.js';
import { writeAudit } from '../lib/audit.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { fromBigInt, toBigInt } from '../lib/amount.js';

export class TaskService {
  constructor(private db: Db, private streams: StreamProvider) {}

  /**
   * Creates the DRAFT shell only. A draft is not on the board and not
   * discoverable — the deposit is what brings a task into existence.
   */
  async createDraft(funderId: string, input: CreateTaskInput) {
    return this.db.task.create({
      data: {
        type: input.type,
        status: 'DRAFT',
        funderId,
        title: input.title,
        description: input.description,
        successCriteria: input.successCriteria,
        skillTags: input.skillTags,
        tokenKind: input.token.kind,
        tokenContract: input.token.kind === 'sip010' ? input.token.contract : null,
        totalAmount: input.totalAmount,
      },
    });
  }

  /** Returns an unsigned deposit tx. The funder signs client-side; we never hold keys. */
  async buildDeposit(taskId: string, funderId: string, funderAddress: string) {
    const task = await this.mustOwn(taskId, funderId);
    if (task.status !== 'DRAFT') {
      throw conflict(`Task is already ${task.status}`, 'ALREADY_FUNDED');
    }
    const token: TokenId =
      task.tokenKind === 'sip010'
        ? { kind: 'sip010', contract: task.tokenContract! }
        : ({ kind: task.tokenKind } as TokenId);

    return this.streams.buildDeposit({
      amount: toBigInt(task.totalAmount),
      token,
      funder: funderAddress,
      memo: `task:${task.id}`,
    });
  }

  /**
   * Records a broadcast deposit. The task sits in FUNDING_PENDING until the
   * transaction confirms, then becomes FUNDED and configurable.
   */
  async confirmDeposit(taskId: string, funderId: string, txId: string) {
    const task = await this.mustOwn(taskId, funderId);
    assertTaskTransition(task.status as never, 'FUNDING_PENDING');

    await this.db.task.update({
      where: { id: task.id },
      data: { status: 'FUNDING_PENDING', depositTxId: txId },
    });

    const depositRef = await this.streams.confirmDeposit(txId);
    if (!depositRef) {
      return { status: 'FUNDING_PENDING' as const, depositRef: null };
    }

    const updated = await this.db.$transaction(async (tx) => {
      const t = await tx.task.update({
        where: { id: task.id },
        data: { status: 'FUNDED', depositRef, fundedAt: new Date() },
      });
      await writeAudit(tx, {
        actorId: funderId,
        entityType: 'task',
        entityId: t.id,
        action: 'deposit_confirmed',
        before: { status: 'FUNDING_PENDING' },
        after: { status: 'FUNDED', depositRef },
        txRef: txId,
      });
      return t;
    });

    return { status: updated.status as 'FUNDED', depositRef };
  }

  /**
   * Recipients and duration are supplied AFTER the deposit confirms. One
   * deposit funds N parallel streams; a bounty is the one-element case.
   *
   * Warns — and blocks unless acknowledged — when the chosen duration and
   * cadence leave too few review cycles for two-strike to reach a drop.
   */
  async configure(taskId: string, funderId: string, input: ConfigureTaskInput) {
    const task = await this.mustOwn(taskId, funderId);
    if (task.status !== 'FUNDED') {
      throw conflict(`Task must be FUNDED to configure, is ${task.status}`, 'NOT_FUNDED');
    }

    const total = toBigInt(task.totalAmount);
    const allocations: Allocation[] =
      input.allocation.model === 'even'
        ? splitEvenly(total, input.allocation.recipients)
        : validateCustomSplit(
            total,
            input.allocation.recipients.map((r) => ({ address: r.address, amount: toBigInt(r.amount) })),
          );

    if (task.type === 'bounty' && allocations.length !== 1) {
      throw badRequest('A bounty streams to exactly one recipient', 'BOUNTY_SINGLE_RECIPIENT');
    }

    const cadence = assessCadence(input.durationSeconds, input.reviewCadence);
    if (cadence.twoStrikeIsDecorative && !input.acknowledgeCadenceWarning) {
      throw badRequest(cadence.warning ?? 'Cadence leaves too few review cycles', 'CADENCE_WARNING');
    }

    assertTaskTransition(task.status as never, 'OPEN');
    await this.db.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: task.id },
        data: {
          status: 'OPEN',
          durationSeconds: input.durationSeconds,
          reviewCadence: input.reviewCadence,
        },
      });
      await writeAudit(tx, {
        actorId: funderId,
        entityType: 'task',
        entityId: task.id,
        action: 'configured',
        after: {
          durationSeconds: input.durationSeconds,
          reviewCadence: input.reviewCadence,
          recipients: allocations.map((a) => ({ address: a.address, amount: fromBigInt(a.amount) })),
          cadenceWarningAcknowledged: cadence.twoStrikeIsDecorative,
        },
      });
    });

    return {
      allocations: allocations.map((a) => ({
        address: a.address,
        amount: fromBigInt(a.amount),
        ratePerSecond: fromBigInt(ratePerSecond(a.amount, input.durationSeconds)),
      })),
      cadence,
    };
  }

  /** Preview a split before the funder commits. Pure; touches nothing. */
  previewAllocation(total: bigint, input: ConfigureTaskInput['allocation']) {
    const allocations =
      input.model === 'even'
        ? splitEvenly(total, input.recipients)
        : validateCustomSplit(
            total,
            input.recipients.map((r) => ({ address: r.address, amount: toBigInt(r.amount) })),
          );
    return allocations.map((a) => ({ address: a.address, amount: fromBigInt(a.amount) }));
  }

  async list(filters: { type?: string; status?: string; skillTag?: string }) {
    return this.db.task.findMany({
      where: {
        // DRAFT and FUNDING_PENDING tasks are never publicly discoverable.
        status: filters.status ?? { in: ['OPEN', 'ACTIVE', 'COMPLETED'] },
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.skillTag ? { skillTags: { has: filters.skillTag } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { funder: { select: { stacksAddress: true, displayName: true } } },
    });
  }

  async get(taskId: string) {
    const task = await this.db.task.findUnique({
      where: { id: taskId },
      include: {
        funder: { select: { stacksAddress: true, displayName: true } },
        participants: {
          include: {
            stream: true,
            user: { select: { stacksAddress: true } },
            // Most recent first: the committee UI reads reports[0] as "this cycle".
            reports: { orderBy: { submittedAt: 'desc' }, take: 6 },
          },
        },
      },
    });
    if (!task) throw notFound('Task not found');
    return task;
  }

  async depositRefOf(taskId: string) {
    const task = await this.db.task.findUnique({ where: { id: taskId } });
    if (!task?.depositRef) throw conflict('Task has no confirmed deposit', 'NO_DEPOSIT');
    return asDepositRef(task.depositRef);
  }

  private async mustOwn(taskId: string, funderId: string) {
    const task = await this.db.task.findUnique({ where: { id: taskId } });
    if (!task) throw notFound('Task not found');
    if (task.funderId !== funderId) throw forbidden('Only the funder can do this');
    return task;
  }
}
