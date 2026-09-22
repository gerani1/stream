import type { Allocation, StacksAddress } from './types.js';

export class AllocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AllocationError';
  }
}

/**
 * One deposit funds N parallel streams (README > Settled: one deposit, many
 * streams). The funder supplies a total and an allocation model; this turns
 * that into per-recipient amounts.
 *
 * Integer-safe: an even split that does not divide evenly distributes the
 * remainder one micro-unit at a time across the first recipients, so the
 * allocations always sum to exactly `total` and no dust is stranded.
 */
export function splitEvenly(total: bigint, recipients: readonly StacksAddress[]): Allocation[] {
  if (recipients.length === 0) throw new AllocationError('At least one recipient is required');
  if (total <= 0n) throw new AllocationError('Total must be positive');
  assertUniqueAddresses(recipients);

  const n = BigInt(recipients.length);
  const base = total / n;
  if (base === 0n) {
    throw new AllocationError(
      `Total ${total} cannot be split across ${recipients.length} recipients without a zero allocation`,
    );
  }
  let remainder = total % n;

  return recipients.map((address) => {
    const extra = remainder > 0n ? 1n : 0n;
    if (remainder > 0n) remainder -= 1n;
    return { address, amount: base + extra };
  });
}

/**
 * Validates a funder-supplied custom split. The allocations must sum to exactly
 * the deposited total — under-allocating would strand funds on StackStream with
 * no board-side way to recover them, and over-allocating would fail on chain
 * partway through, leaving some streams started and others not.
 */
export function validateCustomSplit(total: bigint, allocations: readonly Allocation[]): Allocation[] {
  if (allocations.length === 0) throw new AllocationError('At least one recipient is required');
  assertUniqueAddresses(allocations.map((a) => a.address));

  for (const a of allocations) {
    if (a.amount <= 0n) {
      throw new AllocationError(`Allocation for ${a.address} must be positive`);
    }
  }

  const sum = allocations.reduce((acc, a) => acc + a.amount, 0n);
  if (sum !== total) {
    throw new AllocationError(`Allocations sum to ${sum}, expected exactly ${total}`);
  }
  return [...allocations];
}

function assertUniqueAddresses(addresses: readonly StacksAddress[]): void {
  const seen = new Set<string>();
  for (const a of addresses) {
    if (seen.has(a)) throw new AllocationError(`Duplicate recipient address: ${a}`);
    seen.add(a);
  }
}

/**
 * Micro-units streamed per second.
 *
 * Truncates, so `rate * duration` can be slightly less than `amount`. A stream
 * that runs to term is topped up to its full amount on completion, so the dust
 * only ever shows up on a stream stopped mid-flight — where the recipient
 * receives marginally less than the ideal pro-rata share, and the difference
 * returns to the funder with the rest of the unstreamed remainder.
 */
export function ratePerSecond(amount: bigint, durationSeconds: number): bigint {
  if (durationSeconds <= 0) throw new AllocationError('Duration must be positive');
  return amount / BigInt(durationSeconds);
}
