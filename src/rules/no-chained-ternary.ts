import { defineRule } from '@oxlint/plugins';

/** ESLint's `no-nested-ternary`, with a message that names the IIFE instead of the `else` that `no-else` rejects. */
export default defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Resolve multi-branch values with an IIFE instead of chained ternaries.',
    },
    messages: {
      chainedTernary:
        'Chained ternary: resolve this value with an IIFE that returns early for each branch. In JSX, resolve it above the `return` or in a small component.',
    },
    schema: [],
  },
  create(context) {
    return {
      ConditionalExpression(node) {
        const isChained =
          node.consequent.type === 'ConditionalExpression' ||
          node.alternate.type === 'ConditionalExpression';
        if (!isChained) return;
        context.report({ node, messageId: 'chainedTernary' });
      },
    };
  },
});
