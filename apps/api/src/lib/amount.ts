import { badRequest } from './errors.js';

/**
 * Amounts are stored and transported as decimal strings: bigint does not
 * survive JSON, and floats silently lose precision at token scale.
 */
export function toBigInt(s: string): bigint {
  if (!/^[0-9]+$/.test(s)) throw badRequest(`Invalid amount: ${s}`);
  return BigInt(s);
}

export const fromBigInt = (v: bigint): string => v.toString();

/** Fastify cannot serialise bigint; normalise before it reaches the reply. */
export function serialiseBigInts<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
  ) as T;
}
