import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  applySchema,
  configureTaskSchema,
  confirmDepositSchema,
  createTaskSchema,
  reportSchema,
  streamControlSchema,
  voteSchema,
} from '@board/shared';
import { issueNonce, requireAuth, requireRole, verifyNonceSignature } from '../lib/auth.js';
import { serialiseBigInts } from '../lib/amount.js';
import type { Services } from '../services.js';

const idParam = z.object({ id: z.string().uuid() });

export async function registerRoutes(app: FastifyInstance, svc: Services): Promise<void> {
  // ---- auth ----
  app.post('/auth/nonce', async (req) => {
    const { address } = z.object({ address: z.string().min(10) }).parse(req.body);
    return issueNonce(svc.db, address);
  });

  app.post('/auth/verify', async (req) => {
    const body = z
      .object({
        address: z.string(),
        nonce: z.string(),
        message: z.string(),
        signature: z.string(),
        publicKey: z.string(),
      })
      .parse(req.body);
    const user = await verifyNonceSignature({ db: svc.db, ...body });
    return { token: app.jwt.sign(user, { expiresIn: '7d' }), user };
  });

  // ---- tasks ----
  app.get('/tasks', async (req) => {
    const q = z
      .object({ type: z.string().optional(), status: z.string().optional(), skillTag: z.string().optional() })
      .parse(req.query);
    return svc.tasks.list(q);
  });

  app.get('/tasks/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    return serialiseBigInts(await svc.tasks.get(id));
  });

  app.post('/tasks', async (req, reply) => {
    const user = requireAuth(req, reply);
    const task = await svc.tasks.createDraft(user.id, createTaskSchema.parse(req.body));
    return reply.code(201).send(task);
  });

  // The deposit is what creates the task: build -> sign in wallet -> confirm.
  app.post('/tasks/:id/deposit/build', async (req, reply) => {
    const user = requireAuth(req, reply);
    const { id } = idParam.parse(req.params);
    return serialiseBigInts(await svc.tasks.buildDeposit(id, user.id, user.address));
  });

  app.post('/tasks/:id/deposit/confirm', async (req, reply) => {
    const user = requireAuth(req, reply);
    const { id } = idParam.parse(req.params);
    const { txId } = confirmDepositSchema.parse(req.body);
    return svc.tasks.confirmDeposit(id, user.id, txId);
  });

  // Recipients and duration arrive AFTER the deposit confirms.
  app.post('/tasks/:id/configure', async (req, reply) => {
    const user = requireAuth(req, reply);
    const { id } = idParam.parse(req.params);
    return svc.tasks.configure(id, user.id, configureTaskSchema.parse(req.body));
  });

  // ---- applications ----
  app.post('/tasks/:id/applications', async (req, reply) => {
    const user = requireAuth(req, reply);
    const { id } = idParam.parse(req.params);
    const app_ = await svc.applications.apply(id, user.id, applySchema.parse(req.body));
    return reply.code(201).send(app_);
  });

  app.get('/tasks/:id/applications', async (req, reply) => {
    const user = requireAuth(req, reply);
    const { id } = idParam.parse(req.params);
    return svc.applications.list(id, user.id);
  });

  app.post('/tasks/:id/select', async (req, reply) => {
    const user = requireAuth(req, reply);
    const { id } = idParam.parse(req.params);
    const body = z
      .object({
        applicationIds: z.array(z.string().uuid()).min(1),
        allocation: z.union([
          z.object({ model: z.literal('even') }),
          z.object({ model: z.literal('custom'), amounts: z.record(z.string()) }),
        ]),
      })
      .parse(req.body);
    const participants = await svc.applications.select({
      taskId: id,
      funderId: user.id,
      ...body,
    });
    // Selection and stream start are separate steps so either can be retried alone.
    const streams = await svc.streams.startForTask(id, user.id);
    return { participants, streams };
  });

  // ---- streams ----
  app.get('/streams/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    return serialiseBigInts(await svc.streams.status(id));
  });

  app.post('/streams/:id/pause', async (req, reply) => {
    const user = requireAuth(req, reply);
    const { id } = idParam.parse(req.params);
    const { reason } = streamControlSchema.parse(req.body);
    return svc.streams.pause(id, user, reason);
  });

  app.post('/streams/:id/resume', async (req, reply) => {
    const user = requireAuth(req, reply);
    const { id } = idParam.parse(req.params);
    return svc.streams.resume(id, user.id);
  });

  app.post('/streams/:id/stop', async (req, reply) => {
    const user = requireAuth(req, reply);
    const { id } = idParam.parse(req.params);
    const { reason } = streamControlSchema.parse(req.body);
    return svc.streams.stop(id, user.id, 'funder_cancel', reason);
  });

  // ---- reports and reviews ----
  app.post('/participants/:id/reports', async (req, reply) => {
    const user = requireAuth(req, reply);
    const { id } = idParam.parse(req.params);
    return svc.reviews.submitReport(id, user.id, reportSchema.parse(req.body));
  });

  app.post('/review-cycles/:id/votes', async (req, reply) => {
    const user = requireRole(req, 'committee');
    const { id } = idParam.parse(req.params);
    return svc.reviews.castVote(id, user.id, voteSchema.parse(req.body));
  });

  app.post('/review-cycles/:id/finalize', async (req, reply) => {
    const user = requireRole(req, 'committee');
    const { id } = idParam.parse(req.params);
    return svc.reviews.finalize(id, user.id);
  });

  app.get('/tasks/:id/review-cycles', async (req) => {
    const { id } = idParam.parse(req.params);
    return svc.db.reviewCycle.findMany({
      where: { taskId: id },
      orderBy: { sequence: 'asc' },
    });
  });

  // ---- public audit trail ----
  app.get('/tasks/:id/audit', async (req) => {
    const { id } = idParam.parse(req.params);
    return svc.db.auditLog.findMany({
      where: { OR: [{ entityType: 'task', entityId: id }, { reason: { not: null } }] },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
  });

  app.get('/health', async () => ({ ok: true, provider: svc.provider.name }));
}
