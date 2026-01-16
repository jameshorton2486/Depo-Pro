/**
 * ESLint rule: no-service-role-in-client
 *
 * Prevents SUPABASE_SERVICE_ROLE_KEY usage in client-side code
 * Service role key must only be used in server-only files
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow service role key in client-side code',
      category: 'Security',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      serviceRoleInClient: '❌ SUPABASE_SERVICE_ROLE_KEY must never be used in client-side code. Use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY instead.',
    },
  },
  create(context) {
    const filename = context.getFilename();

    // Check if this is a client file
    const isClientFile =
      filename.includes("'use client'") ||
      filename.includes('"use client"') ||
      (filename.includes('/app/') && !filename.includes('/api/')) ||
      filename.includes('/components/') ||
      filename.includes('/hooks/');

    // Check if file has 'use client' directive
    const sourceCode = context.getSourceCode();
    const firstStatement = sourceCode.ast.body[0];
    const hasUseClient =
      firstStatement?.type === 'ExpressionStatement' &&
      firstStatement.expression?.type === 'Literal' &&
      (firstStatement.expression.value === 'use client' ||
       firstStatement.expression.value === "use client");

    if (isClientFile || hasUseClient) {
      return {
        MemberExpression(node) {
          // Check for process.env.SUPABASE_SERVICE_ROLE_KEY
          if (
            node.object?.type === 'MemberExpression' &&
            node.object?.object?.name === 'process' &&
            node.object?.property?.name === 'env' &&
            node.property?.name === 'SUPABASE_SERVICE_ROLE_KEY'
          ) {
            context.report({
              node,
              messageId: 'serviceRoleInClient',
            });
          }
        },
        Identifier(node) {
          // Check for variable names
          if (node.name === 'SUPABASE_SERVICE_ROLE_KEY') {
            context.report({
              node,
              messageId: 'serviceRoleInClient',
            });
          }
        },
      };
    }

    return {};
  },
};
