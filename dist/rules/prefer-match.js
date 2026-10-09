import { defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';
import { unwrap } from '../ast.js';
/** Looks through optional chains as well as the wrappers `unwrap` removes; `optional` records a chain. */
const strip = (node, optional = false) => {
    const unwrapped = unwrap(node);
    return unwrapped.type === 'ChainExpression'
        ? strip(unwrapped.expression, true)
        : { node: unwrapped, optional };
};
/** True for `x._tag` and `x['_tag']`; a quoted key names the tag whether or not it is computed. */
const readsTag = (node) => {
    if (node.type !== 'MemberExpression')
        return false;
    const property = node.computed ? unwrap(node.property) : node.property;
    if (property.type === 'Literal')
        return property.value === '_tag';
    return (!node.computed && property.type === 'Identifier' && property.name === '_tag');
};
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
            tagSwitch: '`switch` on `_tag`: use `Match.valueTags` from `effect/Match` when every tag has a handler, or `Match.value` with `Match.tag` and `Match.orElse` to keep a fallback.',
            valueSwitch: '`switch` statement: use `Match.value` with `Match.when` and `Match.exhaustive` (or `Match.orElse`) from `effect/Match` instead.',
        },
        schema: [],
    },
    create(context) {
        return {
            SwitchStatement(node) {
                const discriminant = strip(node.discriminant);
                // `Match.valueTags` and `Match.tag` take string tags on a value that is there.
                const hasStringCases = node.cases.every(({ test }) => Predicate.isNull(test) ||
                    (test.type === 'Literal' && Predicate.isString(test.value)));
                const isTagSwitch = readsTag(discriminant.node) &&
                    !discriminant.optional &&
                    hasStringCases;
                context.report({
                    node: context.sourceCode.getFirstToken(node) ?? node,
                    messageId: isTagSwitch ? 'tagSwitch' : 'valueSwitch',
                });
            },
        };
    },
});
