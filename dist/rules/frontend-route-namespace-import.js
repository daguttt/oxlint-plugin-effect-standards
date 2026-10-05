import fs from 'node:fs';
import path from 'node:path';
import { defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';
import { ROUTES_MARKER, resolveRouteSpecifier } from '../route-path.js';
import { findVariable } from '../scope.js';
const CODE_EXTENSION = /^\.[cm]?[jt]sx?$/;
const FEATURE = {
    kind: 'route feature',
    suffix: 'RouteFeat',
    test: /^[A-Z]\w*RouteFeat$/,
};
const ROUTE = { kind: 'route', suffix: 'Route', test: /^[A-Z]\w*Route$/ };
/**
 * Route imports are namespaces named `*Route`; route feature (`-feat`) imports
 * are namespaces named `*RouteFeat`.
 */
export default defineRule({
    meta: {
        type: 'suggestion',
        schema: [],
        messages: {
            notNamespace: "Import '{{source}}' with namespace syntax: `import * as <Name>{{suffix}} from …`.",
            wrongSuffix: "Namespace '{{actual}}' for a {{kind}} import should end in '{{suffix}}'.",
            reExport: 'Re-exporting from a {{kind}} bypasses the `*{{suffix}}` namespace import.',
        },
    },
    create(context) {
        const filename = context.physicalFilename;
        /** What an import resolves to: a route, a route feature's barrel, or neither. */
        const classify = (source) => {
            const target = resolveRouteSpecifier(source, filename);
            if (Predicate.isNull(target))
                return null;
            // An asset next to a route is not a route: `./logo.svg?url`, or a file that exists exactly
            // as written (`./policy.pdf`). `./pets.edit` names `pets.edit.tsx`, so no such file exists.
            const hasBundlerQuery = source.includes('?');
            const isExistingFile = !CODE_EXTENSION.test(path.extname(target)) &&
                fs.statSync(target, { throwIfNoEntry: false })?.isFile() === true;
            const isAsset = hasBundlerQuery || isExistingFile;
            if (isAsset)
                return null;
            const routesAt = target.lastIndexOf(ROUTES_MARKER);
            if (routesAt === -1)
                return null;
            const routesRoot = target.slice(0, routesAt + ROUTES_MARKER.length);
            // `…/-feat/index.ts` and `…/-feat` name the same barrel.
            const segments = target
                .slice(routesRoot.length)
                .replace(/\.[cm]?[jt]sx?$/, '')
                .replace(new RegExp(`\\${path.sep}index$`), '')
                .split(path.sep);
            const featAt = segments.lastIndexOf('-feat');
            if (featAt === -1) {
                // A `-`-prefixed file or folder is not a route.
                return segments.some((segment) => segment.startsWith('-'))
                    ? null
                    : ROUTE;
            }
            const featDirectory = path.join(routesRoot, ...segments.slice(0, featAt + 1));
            // A feature's own files import each other by name.
            if (filename.startsWith(featDirectory + path.sep))
                return null;
            // A file inside another feature is `route-feat-public-api`'s to report.
            const isBarrel = featAt === segments.length - 1;
            return isBarrel ? FEATURE : null;
        };
        const checkReExport = (node) => {
            const { source } = node;
            if (Predicate.isNull(source))
                return;
            const target = classify(source.value);
            if (Predicate.isNull(target))
                return;
            context.report({
                node,
                messageId: 'reExport',
                data: { kind: target.kind, suffix: target.suffix },
            });
        };
        return {
            ImportDeclaration(node) {
                const source = node.source.value;
                const target = classify(source);
                if (Predicate.isNull(target))
                    return;
                const [first, ...rest] = node.specifiers;
                if (Predicate.isUndefined(first))
                    return;
                const isNamespace = rest.length === 0 && first.type === 'ImportNamespaceSpecifier';
                if (!isNamespace) {
                    context.report({
                        node,
                        messageId: 'notNamespace',
                        data: { source, suffix: target.suffix },
                    });
                    return;
                }
                if (target.test.test(first.local.name))
                    return;
                context.report({
                    node: first.local,
                    messageId: 'wrongSuffix',
                    data: {
                        actual: first.local.name,
                        kind: target.kind,
                        suffix: target.suffix,
                    },
                });
            },
            ExportNamedDeclaration: checkReExport,
            ExportAllDeclaration: checkReExport,
            // `import * as XRouteFeat from …` followed by `export { XRouteFeat }` or
            // `export default XRouteFeat` re-exports it just the same.
            'Program:exit'(program) {
                program.body
                    .flatMap((statement) => {
                    if (statement.type === 'ExportDefaultDeclaration')
                        return statement.declaration.type === 'Identifier'
                            ? [{ node: statement, name: statement.declaration.name }]
                            : [];
                    if (statement.type !== 'ExportNamedDeclaration')
                        return [];
                    if (Predicate.isNotNull(statement.source))
                        return [];
                    return statement.specifiers.flatMap((specifier) => specifier.local.type === 'Identifier'
                        ? [{ node: specifier, name: specifier.local.name }]
                        : []);
                })
                    .forEach(({ node, name }) => {
                    const variable = findVariable(context.sourceCode.getScope(node), name);
                    const target = variable?.defs
                        .map((definition) => {
                        if (definition.type !== 'ImportBinding')
                            return null;
                        const declaration = definition.parent;
                        if (declaration?.type !== 'ImportDeclaration')
                            return null;
                        return classify(declaration.source.value);
                    })
                        .find(Predicate.isNotNull);
                    if (Predicate.isNullish(target))
                        return;
                    context.report({
                        node,
                        messageId: 'reExport',
                        data: { kind: target.kind, suffix: target.suffix },
                    });
                });
            },
        };
    },
});
