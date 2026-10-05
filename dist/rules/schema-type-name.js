import { defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';
/** Returns the schema identifier a type alias is derived from, or null. */
const derivedSchemaName = (annotation) => {
    // typeof Y.Type
    if (annotation.type === 'TSTypeQuery') {
        const { exprName } = annotation;
        if (exprName.type !== 'TSQualifiedName')
            return null;
        if (exprName.left.type !== 'Identifier')
            return null;
        return exprName.right.name === 'Type' ? exprName.left.name : null;
    }
    // Schema.Schema.Type<typeof Y>
    if (annotation.type !== 'TSTypeReference')
        return null;
    const typeName = annotation.typeName;
    const isSchemaTypeHelper = typeName.type === 'TSQualifiedName' &&
        typeName.right.name === 'Type' &&
        typeName.left.type === 'TSQualifiedName' &&
        typeName.left.right.name === 'Schema' &&
        typeName.left.left.type === 'Identifier' &&
        typeName.left.left.name === 'Schema';
    if (!isSchemaTypeHelper)
        return null;
    const arg = annotation.typeArguments?.params[0];
    if (arg?.type !== 'TSTypeQuery')
        return null;
    if (arg.exprName.type !== 'Identifier')
        return null;
    return arg.exprName.name;
};
/**
 * A type derived from a schema constant shares the constant's bare name, so
 * TypeScript merges them: `const Foo = Schema…; type Foo = typeof Foo.Type`.
 * Constants carrying an allowed suffix (default `Schema`) are exempt because
 * the standard reserves that suffix for values consumed as a schema.
 */
export default defineRule({
    meta: {
        type: 'suggestion',
        schema: [
            {
                type: 'object',
                properties: { exemptSchemaPattern: { type: 'string' } },
                additionalProperties: false,
            },
        ],
        messages: {
            mismatch: "Type '{{typeName}}' is derived from schema '{{schemaName}}'. Give both one bare name ('{{schemaName}}') and let TypeScript merge them.",
        },
    },
    create(context) {
        const [first] = context.options;
        const configured = Predicate.isObject(first)
            ? first.exemptSchemaPattern
            : undefined;
        const exempt = new RegExp(Predicate.isString(configured) ? configured : 'Schema$');
        return {
            TSTypeAliasDeclaration(node) {
                const schemaName = derivedSchemaName(node.typeAnnotation);
                if (Predicate.isNull(schemaName))
                    return;
                const typeName = node.id.name;
                const isAllowed = typeName === schemaName || exempt.test(schemaName);
                if (isAllowed)
                    return;
                context.report({
                    node: node.id,
                    messageId: 'mismatch',
                    data: { typeName, schemaName },
                });
            },
        };
    },
});
