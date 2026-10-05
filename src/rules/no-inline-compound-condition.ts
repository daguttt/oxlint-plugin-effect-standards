import { type ESTree, defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';

const COMPOUND_OPERATORS = new Set(['&&', '||']);

const isCompound = (
  node: ESTree.Expression
): node is ESTree.LogicalExpression =>
  node.type === 'LogicalExpression' && COMPOUND_OPERATORS.has(node.operator);

/** Strips wrappers that do not change which expression is being branched on. */
const unwrap = (node: ESTree.Expression): ESTree.Expression => {
  if (node.type === 'ParenthesizedExpression') return unwrap(node.expression);
  if (node.type !== 'UnaryExpression') return node;
  return node.operator === '!' ? unwrap(node.argument) : node;
};

const countOperands = (node: ESTree.Expression): number =>
  isCompound(node)
    ? countOperands(unwrap(node.left)) + countOperands(unwrap(node.right))
    : 1;

/** True when every operand is already a bare (optionally negated) identifier. */
const isNamedOperandsOnly = (node: ESTree.Expression): boolean =>
  isCompound(node)
    ? isNamedOperandsOnly(unwrap(node.left)) &&
      isNamedOperandsOnly(unwrap(node.right))
    : node.type === 'Identifier';

export default defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Name compound conditions as descriptive boolean constants before branching on them.',
    },
    messages: {
      nameCondition:
        'Compound condition ({{count}} operands) inline in {{where}}. Name it as a descriptive boolean constant first.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minOperands: { type: 'integer', minimum: 2 },
          checkTernary: { type: 'boolean' },
          ignoreNamedOperands: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const [first] = context.options;
    const options = Predicate.isObject(first) ? first : {};
    const minOperands = Predicate.isNumber(options.minOperands)
      ? options.minOperands
      : 2;
    const checkTernary = options.checkTernary !== false;
    const ignoreNamedOperands = options.ignoreNamedOperands === true;

    const check = (test: ESTree.Expression, where: string) => {
      const condition = unwrap(test);
      if (!isCompound(condition)) return;
      const count = countOperands(condition);
      if (count < minOperands) return;
      const isIgnored = ignoreNamedOperands && isNamedOperandsOnly(condition);
      if (isIgnored) return;
      context.report({
        node: test,
        messageId: 'nameCondition',
        data: { count: String(count), where },
      });
    };

    return {
      IfStatement(node) {
        check(node.test, 'an `if` test');
      },
      // Not `for`: its test reads the loop's own counter, which has no name to give it.
      WhileStatement(node) {
        check(node.test, 'a `while` test');
      },
      DoWhileStatement(node) {
        check(node.test, 'a `do…while` test');
      },
      ConditionalExpression(node) {
        if (checkTernary) check(node.test, 'a ternary test');
      },
      // `{a && b && <Row />}`: everything left of the element is the condition.
      LogicalExpression(node) {
        if (node.operator !== '&&') return;
        const rendered = node.right;
        const isJsxGuard =
          rendered.type === 'JSXElement' ||
          rendered.type === 'JSXFragment' ||
          (rendered.type === 'ParenthesizedExpression' &&
            (rendered.expression.type === 'JSXElement' ||
              rendered.expression.type === 'JSXFragment'));
        if (isJsxGuard) check(node.left, 'a JSX guard');
      },
    };
  },
});
