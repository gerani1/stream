import type { Services } from '../services.js';
import type { Config } from '../config.js';

/**
 * Scheduled work (README > Jobs and scheduling).
 *
 * These run as plain intervals here. Move them onto BullMQ when there is more
 * than one API instance, so two workers cannot race the same stream — every
 * operation below is idempotent, but duplicated provider calls cost gas.
 */
export function startJobs(svc: Services, config: Config): () => void {
  const timers = [
    setInterval(() => void reconcileStreams(svc), 5 * 60_000),
    setInterval(() => void autoResumePaused(svc, config), 60 * 60_000),
  ];
  return () => timers.forEach(clearInterval);
}

/** The DB is a cache of chain truth; this corrects drift from missed webhooks. */
export async function reconcileStreams(svc: Services): Promise<number> {
  const active = await svc.db.stream.findMany({ where: { state: { in: ['active', 'paused'] } } });
  let synced = 0;
  for (const s of active) {
    try {
      await svc.streams.reconcile(s.id);
      synced += 1;
    } catch {
      // A single unreadable stream must not stall the sweep.
    }
  }
  return synced;
}

/**
 * Releases bounty streams paused longer than the cool-off window. Pausing is a
 * cooling-off action, not an indefinite freeze — without this a funder could
 * stall a builder's stream at 90% and simply never resume it.
 */
export async function autoResumePaused(svc: Services, config: Config): Promise<number> {
  const cutoff = new Date(Date.now() - config.BOUNTY_PAUSE_COOLOFF_DAYS * 86_400_000);
  const stale = await svc.db.stream.findMany({
    where: { state: 'paused', pausedAt: { lt: cutoff } },
  });
  let resumed = 0;
  for (const s of stale) {
    try {
      await svc.streams.resume(s.id, null, 'cooloff_auto_resume');
      resumed += 1;
    } catch {
      // Already stopped or completed in the meantime.
    }
  }
  return resumed;
}
