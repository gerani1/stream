import type { Prisma, PrismaClient } from '@prisma/client';

export interface AuditEntry {
  actorId?: string | null;
  entityType: 'task' | 'participant' | 'stream' | 'review' | 'application';
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  txRef?: string | null;
}

/**
 * Every state transition and every stream control action writes here. No
 * exceptions — the audit trail is what makes a drop decision defensible when
 * someone disputes it weeks later (README > Committee and review process).
 *
 * Takes a transaction client so the log and the change it describes commit
 * together or not at all.
 */
export async function writeAudit(
  db: PrismaClient | Prisma.TransactionClient,
  entry: AuditEntry,
): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      before: (entry.before ?? null) as Prisma.InputJsonValue,
      after: (entry.after ?? null) as Prisma.InputJsonValue,
      reason: entry.reason ?? null,
      txRef: entry.txRef ?? null,
    },
  });
}
