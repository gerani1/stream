import { createStreamProvider, type StreamProvider } from '@board/provider';
import type { Config } from './config.js';
import type { Db } from './lib/prisma.js';
import { TaskService } from './modules/tasks.service.js';
import { StreamService } from './modules/streams.service.js';
import { ApplicationService } from './modules/applications.service.js';
import { ReviewService } from './modules/reviews.service.js';

export interface Services {
  db: Db;
  provider: StreamProvider;
  tasks: TaskService;
  streams: StreamService;
  applications: ApplicationService;
  reviews: ReviewService;
}

/** Composition root. The provider switch is the only StackStream coupling. */
export function buildServices(db: Db, config: Config): Services {
  const provider = createStreamProvider(config as unknown as Record<string, string | undefined>);
  const streams = new StreamService(db, provider, config.BOUNTY_PAUSE_COOLOFF_DAYS);
  return {
    db,
    provider,
    streams,
    tasks: new TaskService(db, provider),
    applications: new ApplicationService(db),
    reviews: new ReviewService(db, streams),
  };
}
