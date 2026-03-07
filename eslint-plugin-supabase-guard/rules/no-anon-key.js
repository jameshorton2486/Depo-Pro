/**
 * ESLint rule: no-anon-key
 *
 * Prevents usage of legacy Supabase anon key.
 */
const LEGACY_SUFFIX = 'ANON' + '_KEY';
const LEGACY_ENV = `NEXT_PUBLIC_SUPABASE_${LEGACY_SUFFIX}`;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow legacy Supabase key usage',
      category: 'Security',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      anonKey: '❌ Legacy Supabase key is forbidden. Use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY instead.',
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        // Check for process.env legacy Supabase key
        if (
          node.object?.type === 'MemberExpression' &&
          node.object?.object?.name === 'process' &&
          node.object?.property?.name === 'env' &&
          node.property?.name === LEGACY_ENV
        ) {
          context.report({
            node,
            messageId: 'anonKey',
          });
        }
      },
      Identifier(node) {
        // Check for variable names containing legacy key suffix
        if (
          node.name === LEGACY_ENV ||
          node.name === `SUPABASE_${LEGACY_SUFFIX}` ||
          (node.name.includes(LEGACY_SUFFIX) && node.name.includes('SUPABASE'))
        ) {
          context.report({
            node,
            messageId: 'anonKey',
          });
        }
      },
    };
  },
};
