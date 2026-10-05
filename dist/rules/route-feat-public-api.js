import path from 'node:path';
import { defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';
import { resolveRouteSpecifier } from '../route-path.js';
const FEAT_SEGMENT = '-feat';
/**
 * A `-feat/` directory exposes its public API through `-feat/index.ts`; code
 * outside it imports the barrel, never a file inside.
 */
export default defineRule({
    meta: {
        type: 'problem',
        docs: {
            description: 'Import route-local features through `-feat/index.ts`, never from a file inside the `-feat`.',
        },
        schema: [],
        messages: {
            deepImport: 'Import from the `-feat` public API (`{{barrel}}`) instead of reaching into `{{inner}}`.',
        },
    },
    create(context) {
        const filename = context.physicalFilename;
        const check = (source) => {
            if (Predicate.isNull(source))
                return;
            if (source.type !== 'Literal')
                return;
            const specifier = source.value;
            if (typeof specifier !== 'string')
                return;
            if (!specifier.split('/').includes(FEAT_SEGMENT))
                return;
            const target = resolveRouteSpecifier(specifier, filename);
            if (Predicate.isNull(target))
                return;
            const segments = target.split(path.sep);
            const featIndex = segments.lastIndexOf(FEAT_SEGMENT);
            const featDir = segments.slice(0, featIndex + 1).join(path.sep);
            // A feature's own files import each other freely.
            const isInsideFeat = filename === featDir || filename.startsWith(featDir + path.sep);
            if (isInsideFeat)
                return;
            const inner = segments.slice(featIndex + 1);
            // Joining keeps a nested `index` (`a/index.ts`) from passing as the barrel.
            const isDeep = inner.length > 0 && !/^index(\.[cm]?[jt]sx?)?$/.test(inner.join('/'));
            if (!isDeep)
                return;
            const specifierSegments = specifier.split('/');
            const barrel = specifierSegments
                .slice(0, specifierSegments.lastIndexOf(FEAT_SEGMENT) + 1)
                .join('/');
            context.report({
                node: source,
                messageId: 'deepImport',
                data: { barrel, inner: inner.join('/') },
            });
        };
        return {
            ImportDeclaration: (node) => check(node.source),
            ExportNamedDeclaration: (node) => check(node.source),
            ExportAllDeclaration: (node) => check(node.source),
            ImportExpression: (node) => check(node.source),
        };
    },
});
