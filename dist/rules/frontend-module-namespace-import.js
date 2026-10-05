import { defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';
const MODULE_SOURCE = /^#modules\/([^/]+)$/;
/**
 * `#modules/<name>` is imported as a namespace named after the module:
 * `import * as Forms from '#modules/forms'`.
 */
export default defineRule({
    meta: {
        type: 'suggestion',
        schema: [],
        messages: {
            notNamespace: "Import '{{source}}' with namespace syntax: `import * as {{expected}} from '{{source}}'`.",
            wrongName: "Namespace '{{actual}}' for '{{source}}' should be named after the module: '{{expected}}'.",
            reExport: "Re-exporting from '{{source}}' bypasses the namespace import; import `* as {{expected}}` at the use site instead.",
        },
    },
    create(context) {
        const checkReExport = (node) => {
            if (Predicate.isNull(node.source))
                return;
            const moduleName = MODULE_SOURCE.exec(node.source.value)?.[1];
            if (Predicate.isUndefined(moduleName))
                return;
            const expected = moduleName
                .split(/[-_]/)
                .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
                .join('');
            context.report({
                node,
                messageId: 'reExport',
                data: { source: node.source.value, expected },
            });
        };
        return {
            ImportDeclaration(node) {
                const source = node.source.value;
                const moduleName = MODULE_SOURCE.exec(source)?.[1];
                if (Predicate.isUndefined(moduleName))
                    return;
                const [first, ...rest] = node.specifiers;
                if (Predicate.isUndefined(first))
                    return;
                const expected = moduleName
                    .split(/[-_]/)
                    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
                    .join('');
                const isNamespace = rest.length === 0 && first.type === 'ImportNamespaceSpecifier';
                if (!isNamespace) {
                    context.report({
                        node,
                        messageId: 'notNamespace',
                        data: { source, expected },
                    });
                    return;
                }
                const actual = first.local.name;
                // Case-insensitive so acronyms keep their casing (`CommonUI`).
                const isNamedAfterModule = actual.replaceAll(/[-_]/g, '').toLowerCase() ===
                    moduleName.replaceAll(/[-_]/g, '').toLowerCase() &&
                    /^[A-Z]/.test(actual);
                if (isNamedAfterModule)
                    return;
                context.report({
                    node: first.local,
                    messageId: 'wrongName',
                    data: { source, expected, actual },
                });
            },
            ExportNamedDeclaration: checkReExport,
            ExportAllDeclaration: checkReExport,
        };
    },
});
