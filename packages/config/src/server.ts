import { z } from 'zod';

export const serverConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_BASE_URL: z.string().url().default('https://handovertrack.com'),
  WEB_ORIGIN: z.string().url().default('https://handovertrack.com'),
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3301),
  WORKER_HEARTBEAT_MS: z.coerce.number().int().min(1000).default(30000),
}).superRefine((config, ctx) => {
  if (config.NODE_ENV === 'production') {
    for (const key of ['AUTH_BASE_URL', 'WEB_ORIGIN'] as const) {
      if (new URL(config[key]).protocol !== 'https:') ctx.addIssue({ code: 'custom', path: [key], message: 'Production requires HTTPS' });
    }
  }
});
export type ServerConfig = z.infer<typeof serverConfigSchema>;
export const readServerConfig = (env: Record<string, string | undefined>) => serverConfigSchema.parse(env);
