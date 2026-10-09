import { defineRule } from '@oxlint/plugins';
import { unwrap } from '../ast.js';
/**
 * Flags every `switch` statement. A `Match` expression returns a value, cannot
 * fall through, and proves it handled every case without a trailing
 * `satisfies never`.
 */
export default defineRule({
    meta: {
        type: 'suggestion',
        docs: {
            description: "Use Effect's Match module instead of `switch` statements.",
        },
        messages: {
            tagSwitch: '`switch` on `_tag`: map each tag to a handler with `Match.valueTags` from `effect/Match` instead.',
            valueSwitch: '`switch` statement: use `Match.value` with `Match.when` and `Match.exhaustive` (or `Match.orElse`) from `effect/Match` instead.',
        },
        schema: [],
    },
    create(context) {
        return {
            SwitchStatement(node) {
                const unwrapped = unwrap(node.discriminant);
                // `a?._tag` parses as a chain around the member access.
                const discriminant = unwrapped.type === 'ChainExpression'
                    ? unwrapped.expression
                    : unwrapped;
                // A quoted key names the tag whether or not it is computed.
                const readsTag = discriminant.type === 'MemberExpression' &&
                    (discriminant.property.type === 'Literal'
                        ? discriminant.property.value === '_tag'
                        : !discriminant.computed &&
                            discriminant.property.type === 'Identifier' &&
                            discriminant.property.name === '_tag');
                context.report({
                    node: context.sourceCode.getFirstToken(node) ?? node,
                    messageId: readsTag ? 'tagSwitch' : 'valueSwitch',
                });
            },
        };
    },
});
