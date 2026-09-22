import { z } from 'zod';

/** Stacks mainnet/testnet principal, c32-encoded. */
export const stacksAddress = z
  .string()
  .regex(/^S[0-9A-HJKMNP-TV-Z]{27,40}(\.[a-zA-Z0-9-]{1,40})?$/, 'Invalid Stacks address');

export const tokenId = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('stx') }),
  z.object({ kind: z.literal('sbtc') }),
  z.object({ kind: z.literal('sip010'), contract: z.string().min(3) }),
]);

/** Amounts cross the wire as decimal strings; bigint is not JSON-safe. */
export const microAmount = z
  .string()
  .regex(/^[1-9][0-9]*$/, 'Amount must be a positive integer in micro-units');

export const reviewCadence = z.enum(['weekly', 'biweekly', 'on_submission']);

export const createTaskSchema = z.object({
  type: z.enum(['bounty', 'cohort']),
  title: z.string().min(4).max(140),
  description: z.string().min(20).max(20_000),
  successCriteria: z.string().min(10).max(10_000),
  skillTags: z.array(z.string().min(1).max(32)).max(10).default([]),
  token: tokenId,
  totalAmount: microAmount,
});

export const confirmDepositSchema = z.object({
  txId: z.string().regex(/^(0x)?[0-9a-fA-F]{64}$/, 'Invalid Stacks transaction id'),
});

/**
 * Recipients and duration are supplied AFTER the deposit confirms. The deposit
 * does not need to know who the recipients are.
 */
export const configureTaskSchema = z
  .object({
    durationSeconds: z.number().int().min(3_600).max(365 * 86_400),
    reviewCadence,
    allocation: z.discriminatedUnion('model', [
      z.object({
        model: z.literal('even'),
        recipients: z.array(stacksAddress).min(1).max(50),
      }),
      z.object({
        model: z.literal('custom'),
        recipients: z
          .array(z.object({ address: stacksAddress, amount: microAmount }))
          .min(1)
          .max(50),
      }),
    ]),
    /** Set true to proceed past a cadence warning (README > cadence on short programs). */
    acknowledgeCadenceWarning: z.boolean().default(false),
  })
  .strict();

export const applySchema = z.object({
  proposal: z.string().min(20).max(10_000),
  productUrl: z.string().url().optional(),
  currentTraction: z.record(z.union([z.string(), z.number()])).optional(),
});

export const reportSchema = z.object({
  usersOnboarded: z.number().int().min(0),
  txCount: z.number().int().min(0),
  txVolume: z.string().regex(/^[0-9]+$/),
  retentionDelta: z.number().min(-100).max(10_000),
  shipped: z.string().min(10).max(10_000),
  nextPlan: z.string().min(10).max(10_000),
  blockers: z.string().max(10_000).optional(),
});

export const voteSchema = z.object({
  participantId: z.string().uuid(),
  value: z.enum(['continue', 'flag', 'drop']),
  note: z.string().max(4_000).optional(),
});

export const streamControlSchema = z.object({
  reason: z.string().min(4).max(2_000),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type ConfigureTaskInput = z.infer<typeof configureTaskSchema>;
export type ApplyInput = z.infer<typeof applySchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
