import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'reference/**',
      '.pytest_cache/**',
      'public/mockServiceWorker.js',
      'src/types/database.ts',
      'Audit/runAudit.ts',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  }
  ,
  {
    files: [
      'src/context/**/*.tsx',
      'src/components/conflict/conflictStore.tsx',
      'src/components/conflict/ConflictResolutionModal.tsx',
      'src/components/DeepgramKeytermManager/keytermStore.tsx',
      'src/components/TranscriptEditor/TranscriptEditor.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  }
);
