import path from 'node:path';
import { defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';
import { locate } from '../confect-module-path.js';
const TABLE_FILE = /\/confect\/tables\/[^/]+\.ts$/;
const SPEC_FILE = /\/confect\/.+\.spec\.ts$/;
// The entry name, without an extension: `_generated/docs.ts` is `docs`.
const GENERATED = /(?:^|\/)_generated\/([^/.]+)/;
const IMPL_SOURCE = /\.impl(?:\.[cm]?[jt]s)?$/;
/**
 * `tables/*.ts` and `*.spec.ts` are loaded in contexts that break on the wrong
 * import, with errors that point somewhere else:
 *   - Convex evaluates `tables/` in a schema isolate that rejects runtime imports.
 *   - `confect:codegen` loads every spec to generate `_generated/refs`, so a spec
 *     that reaches `refs` depends on its own output.
 * Both may import a Confect module only through `modules/<name>/domain`.
 */
export default defineRule({
    meta: {
        type: 'problem',
        docs: {
            description: 'Keep the import graphs of table and spec files free of runtime and generated-refs code.',
        },
        messages: {
            moduleEntry: 'Import a Confect module here only through `modules/{{module}}/domain`. {{reason}}',
            tableGenerated: 'Convex evaluates `tables/` in a schema isolate that rejects runtime imports, so a table file must not import `_generated` code (`NoImportModuleInSchema`).',
            specRefs: "A spec that reaches `_generated/refs` creates a cycle through `_generated/spec` (`Cannot read properties of undefined (reading 'name')` during `confect:codegen`). Move refs-dependent code into the `*.impl.ts` file.",
            specImpl: 'A spec must not import an `*.impl.ts` file: implementations reach `_generated/refs`, which is generated from the specs.',
        },
        schema: [],
    },
    create(context) {
        const filename = context.filename.replaceAll('\\', '/');
        const isTable = TABLE_FILE.test(filename);
        const isSpec = !isTable && SPEC_FILE.test(filename);
        const isOutsideScope = !isTable && !isSpec;
        if (isOutsideScope)
            return {};
        const reason = isTable
            ? 'The barrel and the other layers pull Convex runtime code into the schema isolate (`NoImportModuleInSchema`).'
            : "The barrel and the other layers reach `_generated/refs`, which is generated from this spec (`Cannot read properties of undefined (reading 'name')` during `confect:codegen`).";
        const check = (node) => {
            if (Predicate.isNullish(node.source))
                return;
            const source = node.source.value;
            const generated = GENERATED.exec(source);
            if (Predicate.isNotNull(generated)) {
                if (isTable) {
                    context.report({ node, messageId: 'tableGenerated' });
                    return;
                }
                if (generated[1] === 'refs') {
                    context.report({ node, messageId: 'specRefs' });
                }
                return;
            }
            if (!source.startsWith('.'))
                return;
            const isSpecImportingImpl = isSpec && IMPL_SOURCE.test(source);
            if (isSpecImportingImpl) {
                context.report({ node, messageId: 'specImpl' });
                return;
            }
            const target = locate(path.resolve(path.dirname(filename), source));
            if (Predicate.isNull(target))
                return;
            const isDomainEntry = target.layer === 'domain' && Predicate.isNull(target.rest);
            if (isDomainEntry)
                return;
            context.report({
                node,
                messageId: 'moduleEntry',
                data: { module: target.module, reason },
            });
        };
        return {
            ImportDeclaration: check,
            ExportNamedDeclaration: check,
            ExportAllDeclaration: check,
        };
    },
});
