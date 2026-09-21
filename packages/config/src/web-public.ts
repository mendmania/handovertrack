import { z } from 'zod';
// This entrypoint never imports server configuration.
export const webPublicConfigSchema = z.object({
  NEXT_PUBLIC_WEB_ORIGIN: z.string().url().default('https://handovertrack.com'),
});
