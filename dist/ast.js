/** Looks through `satisfies`, `as`, `!` and parentheses, which do not change the value. */
export const unwrap = (node) => {
    const isWrapper = node.type === 'TSSatisfiesExpression' ||
        node.type === 'TSAsExpression' ||
        node.type === 'TSNonNullExpression' ||
        node.type === 'ParenthesizedExpression';
    return isWrapper ? unwrap(node.expression) : node;
};
