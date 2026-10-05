import { type ESTree, defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

const SKIPPED_KEYS = new Set(['parent', 'loc', 'range', 'start', 'end']);

/** True when the subtree awaits anything outside its nested functions; in an async generator a `yield` awaits too. */
const awaitsInSameFunction = (
  value: unknown,
  yieldAwaits: boolean
): boolean => {
  if (Array.isArray(value))
    return value.some((child) => awaitsInSameFunction(child, yieldAwaits));
  if (!Predicate.isObject(value)) return false;
  const type = value.type;
  if (!Predicate.isString(type)) return false;
  if (type === 'AwaitExpression') return true;
  const isForAwait = type === 'ForOfStatement' && value.await === true;
  if (isForAwait) return true;
  const isAwaitingYield = type === 'YieldExpression' && yieldAwaits;
  if (isAwaitingYield) return true;
  if (FUNCTION_TYPES.has(type)) return false;
  return Object.entries(value).some(
    ([key, child]) =>
      !SKIPPED_KEYS.has(key) && awaitsInSameFunction(child, yieldAwaits)
  );
};

type FunctionNode = ESTree.Function | ESTree.ArrowFunctionExpression;

const enclosingFunction = (node: ESTree.Node): FunctionNode | null => {
  const parent = node.parent;
  if (Predicate.isNull(parent)) return null;
  const isFunction =
    parent.type === 'FunctionDeclaration' ||
    parent.type === 'FunctionExpression' ||
    parent.type === 'ArrowFunctionExpression';
  return isFunction ? parent : enclosingFunction(parent);
};

export default defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Use Effect's Result module (or Effect.try / Effect.tryPromise) instead of try/catch.",
    },
    messages: {
      syncTryCatch:
        'Synchronous `try`/`catch`: use `Result.try` and branch on the Result instead.',
      asyncTryCatch:
        '`try`/`catch` around `await`: model the failure with `Effect.tryPromise` instead.',
      generatorTryCatch:
        '`try`/`catch` inside a generator: use Effect error channel combinators instead.',
      tryFinally:
        '`try`/`finally` without `catch`: use `Effect.ensuring` / `Effect.acquireUseRelease` if this is Effect code.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          checkAsync: { type: 'boolean' },
          checkFinallyOnly: { type: 'boolean' },
          checkGenerators: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const [first] = context.options;
    const options = Predicate.isObject(first) ? first : {};
    const checkAsync = options.checkAsync === true;
    const checkFinallyOnly = options.checkFinallyOnly === true;
    const checkGenerators = options.checkGenerators !== false;
    return {
      TryStatement(node) {
        const tryToken = context.sourceCode.getFirstToken(node) ?? node;
        if (Predicate.isNull(node.handler)) {
          if (checkFinallyOnly) {
            context.report({ node: tryToken, messageId: 'tryFinally' });
          }
          return;
        }
        const fn = enclosingFunction(node);
        const isGenerator =
          Predicate.isNotNull(fn) &&
          fn.type !== 'ArrowFunctionExpression' &&
          fn.generator;
        const isAsyncGenerator = isGenerator && fn.async;
        if (awaitsInSameFunction(node.block, isAsyncGenerator)) {
          if (checkAsync) {
            context.report({ node: tryToken, messageId: 'asyncTryCatch' });
          }
          return;
        }
        // Reported by default: `effecttsgo/try-catch-in-effect-gen` only sees Effect generators.
        if (isGenerator) {
          if (checkGenerators) {
            context.report({ node: tryToken, messageId: 'generatorTryCatch' });
          }
          return;
        }
        context.report({ node: tryToken, messageId: 'syncTryCatch' });
      },
    };
  },
});
