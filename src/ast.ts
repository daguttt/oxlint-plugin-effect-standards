import type { ESTree } from '@oxlint/plugins';

/** Looks through `satisfies`, `as`, `!` and parentheses, which do not change the value. */
export const unwrap = (node: ESTree.Argument): ESTree.Argument => {
  const isWrapper =
    node.type === 'TSSatisfiesExpression' ||
    node.type === 'TSAsExpression' ||
    node.type === 'TSNonNullExpression' ||
    node.type === 'ParenthesizedExpression';
  return isWrapper ? unwrap(node.expression) : node;
};
