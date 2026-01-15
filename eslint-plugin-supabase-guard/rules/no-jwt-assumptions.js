/**
 * ESLint rule: no-jwt-assumptions
 * 
 * Prevents JWT format assumptions (eyJhbGci...)
 * Enforces publishable key format (sb_publishable_...)
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow JWT format assumptions for Supabase keys',
      category: 'Security',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      jwtAssumption: '❌ Legacy JWT assumptions detected. Supabase publishable keys must start with "sb_publishable_".',
    },
  },
  create(context) {
    return {
      Literal(node) {
        // Check for JWT prefix in string literals
        if (typeof node.value === 'string' && node.value.startsWith('eyJhbGci')) {
          // Allow if it's clearly a comment, documentation, or test data
          const parent = node.parent;
          if (
            parent?.type === 'Property' &&
            (parent.key?.name === 'description' || 
             parent.key?.name === 'comment' ||
             parent.key?.name === 'example' ||
             parent.key?.name === 'test')
          ) {
            return; // Allow in documentation/test files
          }
          
          // Allow in test files
          const filename = context.getFilename();
          if (filename.includes('test') || filename.includes('spec')) {
            return;
          }
          
          context.report({
            node,
            messageId: 'jwtAssumption',
          });
        }
      },
      CallExpression(node) {
        // Check for startsWith('eyJ') or similar JWT checks
        if (
          node.callee?.type === 'MemberExpression' &&
          node.callee?.property?.name === 'startsWith'
        ) {
          const firstArg = node.arguments[0];
          if (
            firstArg?.type === 'Literal' &&
            typeof firstArg.value === 'string' &&
            (firstArg.value.startsWith('eyJ') || firstArg.value === 'eyJ')
          ) {
            // Allow in test files
            const filename = context.getFilename();
            if (filename.includes('test') || filename.includes('spec')) {
              return;
            }
            
            context.report({
              node,
              messageId: 'jwtAssumption',
            });
          }
        }
      },
    };
  },
};
