import { z } from 'zod';
export const mobilePublicConfigSchema = z.object({
  EXPO_PUBLIC_API_ORIGIN: z.string().url().default('https://handovertrack.com'),
});
