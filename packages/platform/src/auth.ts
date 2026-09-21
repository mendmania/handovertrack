import { betterAuth } from 'better-auth';
import { expo } from '@better-auth/expo';
import type { Pool } from 'pg';
import type { ServerConfig } from '@handovertrack/config/server';

export function createAuth(pool: Pool, config: ServerConfig, provisioning = false) {
  if (provisioning && config.NODE_ENV === 'production') throw new Error('Development provisioning is disabled in production');
  return betterAuth({
    appName: 'HandoverTrack',
    database: pool,
    baseURL: config.AUTH_BASE_URL,
    basePath: '/api/auth',
    secret: config.AUTH_SECRET,
    trustedOrigins: [config.WEB_ORIGIN, 'handovertrack://'],
    emailAndPassword: {
      enabled: true, disableSignUp: !provisioning, requireEmailVerification: false, autoSignIn: false,
    },
    // Operator provisioning is an offline command. No verification flags are fabricated.
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    advanced: {
      cookiePrefix: 'handovertrack',
      useSecureCookies: config.NODE_ENV === 'production',
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: config.NODE_ENV === 'production', path: '/' },
    },
    plugins: [expo()],
    logger: { level: 'error' },
  });
}
