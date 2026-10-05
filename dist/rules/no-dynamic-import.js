import { defineRule } from '@oxlint/plugins';
/** Convex's V8 runtime rejects dynamic `import()`; refs-dependent code belongs in `*.impl.ts`. */
export default defineRule({
    meta: {
        type: 'problem',
        docs: { description: 'Disallow dynamic import() in Convex runtime code.' },
        messages: {
            dynamicImport: "Convex's V8 runtime rejects dynamic `import()` (`TypeError: dynamic module import unsupported`). Use a static import; move `_generated/refs`-dependent code into a `*.impl.ts` file.",
        },
        schema: [],
    },
    create(context) {
        return {
            ImportExpression(node) {
                context.report({ node, messageId: 'dynamicImport' });
            },
        };
    },
});
