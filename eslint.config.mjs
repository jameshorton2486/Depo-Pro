import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import supabaseGuard from './eslint-plugin-supabase-guard/index.js';

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
      '**/*.config.ts',
      'tests/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      'vitest.config.ts',
      '.backup-*/**',
      'backup/**',
      'archive/**',
      'prisma-backup*/**',
      'work_files/**',
      'app_backup_*/**',
      '*_backup_*/**',
      '**/*.config.js',
      '**/*.config.mjs',
      'eslint-plugin-supabase-guard/**',
      'next-env.d.ts',
      // Non-MVP / Legacy files
      'test-env.js',
      'test-env-browser.js',
      'verify-supabase.js',
      'verify-db.js',
      'test-supabase-connection.js',
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
  // Equivalent to: extends: ['next/core-web-vitals']
  // This configuration:
  // - Prevents App Router contract violations
  // - Catches server/client misuse early
  // - Enforces Core Web Vitals best practices
  // - Zero runtime impact (lint-time only)
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
    plugins: {
      'supabase-guard': supabaseGuard,
    },
    rules: {
      // 🔒 Supabase Authentication Enforcement
      'supabase-guard/no-anon-key': 'error',
      'supabase-guard/no-jwt-assumptions': 'error',
      'supabase-guard/no-service-role-in-client': 'error',

      // 🔴 Build safety - Prevent console.log in production
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // 🔒 Runtime safety - Prevent Edge runtime misuse
      'no-restricted-globals': [
        'error',
        {
          name: 'process',
          message: 'process is not allowed in Edge runtime. Use export const runtime = "nodejs" if you need Node APIs.',
        },
      ],

      // 🧠 Type discipline - Keep any usage explicit (currently off, but can be enabled)
      '@typescript-eslint/no-explicit-any': 'off', // TODO: Enable after Phase 5 cleanup

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

      // 🧹 Cleanliness
      'prefer-const': 'error',

      // 🔒 Consistent imports - Prefer type imports for types
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // SERVER-SIDE CODE OVERRIDES - Allow process.env and console in server code
  // ---------------------------------------------------------------------------
  {
    files: ['lib/**/*.ts', 'lib/**/*.tsx'],
    rules: {
      'no-restricted-globals': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['app/api/**/*.ts', 'app/api/**/*.tsx'],
    rules: {
      'no-restricted-globals': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['app/(auth)/**/*.tsx', 'app/(auth)/**/*.ts'],
    rules: {
      'no-restricted-globals': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['middleware.ts'],
    rules: {
      'no-restricted-globals': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['components/**/*.tsx', 'components/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];

