import { defineConfig } from 'tsup';
export default defineConfig({ entry: ['src/main.ts'], format: ['esm'], platform: 'node', target: 'node24', noExternal: [/^@handovertrack\//], external: ['sharp', 'pg', 'kysely', 'zod'], sourcemap: true, clean: true });
