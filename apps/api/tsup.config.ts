import { defineConfig } from 'tsup';
export default defineConfig({ entry: ['src/main.ts'], format: ['esm'], platform: 'node', target: 'node24', noExternal: [/^@handovertrack\//], external: ['pg', 'kysely', 'zod', 'better-auth', '@better-auth/expo'], sourcemap: true, clean: true });
