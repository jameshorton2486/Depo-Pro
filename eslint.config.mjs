import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  // Global ignores
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'node_modules/**',
      'scripts/**',
      'tests/**',
      'prisma/**',
      '.backup-*/**',
      'backup/**',
      'work_files/**',
      'app_backup_*/**',
      '*_backup_*/**',
      '**/*.config.js',
      '**/*.config.mjs',
      // Non-MVP / Legacy files
      'test-env.js',
      'app/features/**',
      'lib/extraction/**',
      'lib/permissions/**',
      'lib/workers/**',
      'lib/queue/**',
      'lib/redis.ts',
      'lib/invoice.ts',
      '**/*.md',
    ],
  },
  // Base JS rules
  eslint.configs.recommended,
  // TypeScript rules
  ...tseslint.configs.recommended,
  // Next.js plugin
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  // Custom overrides
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // STABILIZATION: Strict unused-vars enforcement
      // Variables/parameters prefixed with _ are allowed (intentionally unused)
      // All other unused vars/params are errors
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'prefer-const': 'error',
    },
  },
];
