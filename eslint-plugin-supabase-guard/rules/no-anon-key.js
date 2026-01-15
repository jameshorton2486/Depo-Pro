/**
 * ESLint rule: no-anon-key
 * 
 * Prevents usage of legacy NEXT_PUBLIC_SUPABASE_ANON_KEY
 * Enforces NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY usage
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow legacy Supabase anon key usage',
      category: 'Security',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      anonKey: '❌ Legacy Supabase anon key is forbidden. Use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY instead.',
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        // Check for process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (
          node.object?.type === 'MemberExpression' &&
          node.object?.object?.name === 'process' &&
          node.object?.property?.name === 'env' &&
          node.property?.name === 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
        ) {
          context.report({
            node,
            messageId: 'anonKey',
          });
        }
      },
      Identifier(node) {
        // Check for variable names containing ANON_KEY
        if (
          node.name === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' ||
          node.name === 'SUPABASE_ANON_KEY' ||
          (node.name.includes('ANON_KEY') && node.name.includes('SUPABASE'))
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
