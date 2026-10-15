import { defineRule } from '@oxlint/plugins';
/**
 * Flags a ternary whose consequent or alternate is another ternary, as
 * ESLint's `no-nested-ternary` does. Its message points at an IIFE with early
 * returns, since the built-in rule suggests the `else` that `no-else` rejects.
 */
export default defineRule({
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Resolve multi-branch values with an IIFE instead of chained ternaries.',
        },
        messages: {
            chainedTernary: 'Chained ternary: resolve this value with an IIFE that returns early for each branch. In JSX, resolve it above the `return` or in a small component.',
        },
        schema: [],
    },
    create(context) {
        return {
            ConditionalExpression(node) {
                const isChained = node.consequent.type === 'ConditionalExpression' ||
                    node.alternate.type === 'ConditionalExpression';
                if (!isChained)
                    return;
                context.report({ node, messageId: 'chainedTernary' });
            },
        };
    },
});
