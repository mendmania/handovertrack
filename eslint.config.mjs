import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['**/node_modules/**', '.tools/**', '**/dist/**', '**/.next/**', '**/.expo/**', '**/ios/**', '**/android/**', '.local/**', '**/generated.ts', '**/next-env.d.ts', 'test-results/**', 'playwright-report/**'] },
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] } },
);
