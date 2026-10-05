import { defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';
import { resolveValue } from '../scope.js';
/**
 * True when the options object names `concurrency`, directly or through a spread of a readable
 * `const`. A spread that cannot be read is trusted. `seen` stops a constant that spreads itself.
 */
const statesConcurrency = (sourceCode, options, seen) => options.properties.some((property) => {
    if (property.type === 'SpreadElement') {
        const spread = resolveValue(sourceCode, property.argument);
        if (spread?.type !== 'ObjectExpression')
            return true;
        if (seen.includes(spread))
            return false;
        return statesConcurrency(sourceCode, spread, [...seen, options]);
    }
    const { key } = property;
    // A quoted key names the option whether or not it is computed.
    if (key.type === 'Literal')
        return key.value === 'concurrency';
    if (property.computed)
        return false;
    return key.type === 'Identifier' && key.name === 'concurrency';
});
export default defineRule({
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Require an explicit `concurrency` option on Effect.all over a literal collection.',
        },
        messages: {
            missingConcurrency: "`Effect.all` runs sequentially by default. Pass `{ concurrency: 'unbounded' }` (or the greatest safe bound) for independent work, or `{ concurrency: 1 }` to state that the order is a real dependency.",
        },
        schema: [],
    },
    create(context) {
        return {
            CallExpression(node) {
                const { callee } = node;
                const isEffectAll = callee.type === 'MemberExpression' &&
                    !callee.computed &&
                    callee.object.type === 'Identifier' &&
                    callee.object.name === 'Effect' &&
                    callee.property.name === 'all';
                if (!isEffectAll)
                    return;
                const [first, second] = node.arguments;
                if (Predicate.isUndefined(first))
                    return;
                const collection = resolveValue(context.sourceCode, first);
                if (Predicate.isNull(collection))
                    return;
                const entries = collection.type === 'ArrayExpression'
                    ? collection.elements
                    : collection.type === 'ObjectExpression'
                        ? collection.properties
                        : null;
                if (Predicate.isNull(entries))
                    return;
                // A spread hides the real size, so only a lone non-spread element is provably fine.
                const isProvablySingle = entries.length < 2 &&
                    !entries.some((entry) => entry?.type === 'SpreadElement');
                if (isProvablySingle)
                    return;
                if (Predicate.isUndefined(second)) {
                    context.report({
                        node: node.callee,
                        messageId: 'missingConcurrency',
                    });
                    return;
                }
                const options = resolveValue(context.sourceCode, second);
                if (options?.type !== 'ObjectExpression')
                    return;
                const declaresConcurrency = statesConcurrency(context.sourceCode, options, []);
                if (declaresConcurrency)
                    return;
                context.report({ node: node.callee, messageId: 'missingConcurrency' });
            },
        };
    },
});
