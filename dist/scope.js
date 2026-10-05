import * as Predicate from 'effect/Predicate';
import { unwrap } from './ast.js';
/** The binding `name` resolves to, looking outward from `scope`, or null when the file declares none. */
export const findVariable = (scope, name) => {
    if (Predicate.isNull(scope))
        return null;
    const variable = scope.set.get(name);
    const isDeclaredHere = Predicate.isNotUndefined(variable) && variable.defs.length > 0;
    return isDeclaredHere ? variable : findVariable(scope.upper, name);
};
/**
 * What a value expression denotes, with type wrappers removed: itself, or the
 * initializer of the plain `const` it names, following one constant that names
 * another. Null when it names anything else, such as a parameter, a `let`, or
 * a destructured binding. `seen` stops constants that name each other.
 */
export const resolveValue = (sourceCode, expression, seen = []) => {
    const node = unwrap(expression);
    if (node.type !== 'Identifier')
        return node;
    const declarator = findVariable(sourceCode.getScope(node), node.name)
        ?.defs.map((definition) => definition.node)
        .find((definition) => definition.type === 'VariableDeclarator');
    if (Predicate.isUndefined(declarator))
        return null;
    if (Predicate.isNull(declarator.init))
        return null;
    // A pattern binds part of the initializer, not the whole of it.
    if (declarator.id.type !== 'Identifier')
        return null;
    const { parent } = declarator;
    const isConst = parent.type === 'VariableDeclaration' && parent.kind === 'const';
    if (!isConst)
        return null;
    if (seen.includes(declarator))
        return null;
    return resolveValue(sourceCode, declarator.init, [...seen, declarator]);
};
