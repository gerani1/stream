import { randomBytes } from 'node:crypto';
import { verifyMessageSignatureRsv } from '@stacks/encryption';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Role } from '@board/shared';
import type { Db } from './prisma.js';
import { forbidden, unauthorized } from './errors.js';

const NONCE_TTL_MS = 10 * 60 * 1000;

export interface SessionUser {
  id: string;
  address: string;
  roles: Role[];
}

// @fastify/jwt owns the `user` property on FastifyRequest; augment its types
// rather than Fastify's, or the two declarations conflict.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: SessionUser;
    user: SessionUser;
  }
}

/**
 * Wallet-first auth: no passwords. The user signs a domain-bound, single-use
 * message; we exchange a valid signature for a session JWT.
 */
export function buildSignMessage(params: {
  domain: string;
  address: string;
  nonce: string;
  issuedAt: string;
}): string {
  return [
    `${params.domain} wants you to sign in with your Stacks account:`,
    params.address,
    '',
    'Sign in to the StackStream Bounty Board.',
    '',
    `Nonce: ${params.nonce}`,
    `Issued At: ${params.issuedAt}`,
  ].join('\n');
}

export async function issueNonce(db: Db, address: string): Promise<{ nonce: string; message: string; domain: string }> {
  const nonce = randomBytes(16).toString('hex');
  await db.authNonce.create({
    data: { address, nonce, expiresAt: new Date(Date.now() + NONCE_TTL_MS) },
  });
  const domain = 'stackstream-board';
  return {
    nonce,
    domain,
    message: buildSignMessage({ domain, address, nonce, issuedAt: new Date().toISOString() }),
  };
}

export async function verifyNonceSignature(params: {
  db: Db;
  address: string;
  nonce: string;
  message: string;
  signature: string;
  publicKey: string;
}): Promise<SessionUser> {
  const row = await params.db.authNonce.findUnique({ where: { nonce: params.nonce } });
  if (!row) throw unauthorized('Unknown nonce');
  if (row.usedAt) throw unauthorized('Nonce already used');
  if (row.expiresAt < new Date()) throw unauthorized('Nonce expired');
  if (row.address !== params.address) throw unauthorized('Nonce does not match address');
  if (!params.message.includes(params.nonce)) throw unauthorized('Message does not contain the nonce');

  const ok = verifyMessageSignatureRsv({
    message: params.message,
    signature: params.signature,
    publicKey: params.publicKey,
  });
  if (!ok) throw unauthorized('Invalid signature');

  // Single-use: burn the nonce before issuing a session.
  await params.db.authNonce.update({ where: { id: row.id }, data: { usedAt: new Date() } });

  const user = await params.db.user.upsert({
    where: { stacksAddress: params.address },
    create: { stacksAddress: params.address, roles: ['builder'] },
    update: {},
  });

  return { id: user.id, address: user.stacksAddress, roles: user.roles as Role[] };
}

export function requireAuth(req: FastifyRequest, _reply: FastifyReply): SessionUser {
  if (!req.user) throw unauthorized();
  return req.user;
}

export function requireRole(req: FastifyRequest, role: Role): SessionUser {
  const user = requireAuth(req, undefined as unknown as FastifyReply);
  if (!user.roles.includes(role) && !user.roles.includes('admin')) {
    throw forbidden(`Requires the "${role}" role`);
  }
  return user;
}
