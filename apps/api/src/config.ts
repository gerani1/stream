import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  WEB_BASE_URL: z.string().url().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(16),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  STACKS_NETWORK: z.enum(['mainnet', 'testnet', 'devnet']).default('testnet'),
  HIRO_API_URL: z.string().url().default('https://api.testnet.hiro.so'),
  CHAINHOOK_WEBHOOK_SECRET: z.string().min(8),
  STREAM_PROVIDER: z.enum(['mock', 'stackstream']).default('mock'),
  STACKSTREAM_API_URL: z.string().optional(),
  STACKSTREAM_API_KEY: z.string().optional(),
  STACKSTREAM_CONTRACT_ADDRESS: z.string().optional(),
  BOUNTY_PAUSE_COOLOFF_DAYS: z.coerce.number().default(7),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment:\n${issues}\n\nSee .env.example.`);
  }
  return parsed.data;
}
