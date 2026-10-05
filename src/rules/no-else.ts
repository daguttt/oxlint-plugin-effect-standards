import { type ESTree, defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';

const JUMP_STATEMENTS = new Set([
  'ReturnStatement',
  'ThrowStatement',
  'ContinueStatement',
  'BreakStatement',
]);

/** True when control never falls out of the bottom of the statement. */
const alwaysJumps = (statement: ESTree.Statement): boolean => {
  if (JUMP_STATEMENTS.has(statement.type)) return true;
  if (statement.type === 'BlockStatement') {
    const last = statement.body.at(-1);
    return Predicate.isNotUndefined(last) && alwaysJumps(last);
  }
  if (statement.type === 'IfStatement') {
    return (
      Predicate.isNotNull(statement.alternate) &&
      alwaysJumps(statement.consequent) &&
      alwaysJumps(statement.alternate)
    );
  }
  return false;
};

export default defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Replace `else` with early-return guards.',
    },
    messages: {
      redundantElse:
        'Redundant `{{keyword}}`: the branch above always exits, so drop the `else` and continue at the outer level.',
      restructureElse:
        'Replace `{{keyword}}` with an early-return guard (or a ternary / IIFE that resolves the value).',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      IfStatement(node) {
        if (Predicate.isNull(node.alternate)) return;
        const elseToken = sourceCode.getTokenBefore(node.alternate);
        const keyword =
          node.alternate.type === 'IfStatement' ? 'else if' : 'else';
        context.report({
          node: elseToken ?? node.alternate,
          messageId: alwaysJumps(node.consequent)
            ? 'redundantElse'
            : 'restructureElse',
          data: { keyword },
        });
      },
    };
  },
});
