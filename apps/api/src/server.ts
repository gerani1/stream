import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { ZodError } from 'zod';
import { AllocationError, InvalidTransitionError, QuorumError } from '@board/shared';
import { StreamProviderError } from '@board/provider';
import { loadConfig } from './config.js';
import { prisma } from './lib/prisma.js';
import { HttpError } from './lib/errors.js';
import { buildServices } from './services.js';
import { registerRoutes } from './routes/index.js';
import { startJobs } from './jobs/index.js';

export async function buildServer() {
  const config = loadConfig();
  const app = Fastify({ logger: { level: config.NODE_ENV === 'test' ? 'silent' : 'info' } });

  await app.register(cors, { origin: config.WEB_BASE_URL, credentials: true });
  await app.register(jwt, { secret: config.JWT_SECRET });

  // Optional auth: an absent or invalid token is not an error here. Routes that
  // need a user call requireAuth themselves.
  app.addHook('onRequest', async (req) => {
    try {
      await req.jwtVerify();
    } catch {
      Reflect.deleteProperty(req, 'user');
    }
  });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({ error: err.message, code: err.code });
    }
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'Validation failed', issues: err.issues });
    }
    if (err instanceof AllocationError || err instanceof InvalidTransitionError) {
      return reply.code(400).send({ error: err.message, code: err.name });
    }
    if (err instanceof QuorumError) {
      return reply.code(409).send({ error: err.message, code: 'QUORUM_NOT_MET' });
    }
    if (err instanceof StreamProviderError) {
      const status = err.code === 'NOT_IMPLEMENTED' ? 501 : 502;
      return reply.code(status).send({ error: err.message, code: err.code });
    }
    app.log.error(err);
    return reply.code(500).send({ error: 'Internal error' });
  });

  const services = buildServices(prisma, config);
  await registerRoutes(app, services);
  const stopJobs = startJobs(services, config);
  app.addHook('onClose', async () => stopJobs());

  return { app, config, services };
}

const isEntrypoint = process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js');
if (isEntrypoint) {
  buildServer()
    .then(({ app, config }) => app.listen({ port: config.PORT, host: '0.0.0.0' }))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
