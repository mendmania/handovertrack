import { defineConfig } from 'tsup';
export default defineConfig({ entry: { main: 'src/main.ts', 'report-render': '../../packages/platform/src/reports/render-entry.ts' }, format: ['esm'], platform: 'node', target: 'node24', noExternal: [/^@handovertrack\//], external: ['sharp', 'pg', 'kysely', 'zod', 'pdfkit'], sourcemap: true, clean: true });
