import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      '.tmp/**',
      '**/.pytest_cache/**',
      '**/__pycache__/**',
      'reference/**',
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
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      // CANON-RAW-001 guard: forbid reducing a canonical field result to its bare
      // `.value` inline at the call, which silently discards rawInput and policy
      // provenance. Hold the result and persist rawInput + policyId@version, or
      // route through canonicalValue() when raw is intentionally dropped.
      "no-restricted-syntax": [
        "error",
        {
          // Direct form: canonicalizeX(...).value / formatCanonicalField(...).value
          selector:
            "MemberExpression[property.name='value'][object.type='CallExpression'][object.callee.name=/^(canonicalize[A-Z]|formatCanonicalField$)/]",
          message:
            "Canonical field results must not be reduced to .value. Persist rawInput and policyId@version alongside the canonical value (use canonicalValue() only when raw is intentionally dropped) — see CANON-RAW-001 and ratified decision A1.",
        },
        {
          // Non-null-asserted form: canonicalizeX(...)!.value
          selector:
            "MemberExpression[property.name='value'][object.type='TSNonNullExpression'][object.expression.type='CallExpression'][object.expression.callee.name=/^(canonicalize[A-Z]|formatCanonicalField$)/]",
          message:
            "Canonical field results must not be reduced to .value. Persist rawInput and policyId@version alongside the canonical value (use canonicalValue() only when raw is intentionally dropped) — see CANON-RAW-001 and ratified decision A1.",
        },
      ],
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
