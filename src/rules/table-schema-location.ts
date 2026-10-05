import { defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';

import { findVariable } from '../scope.ts';

const MODELS_FILE = /\/modules\/[^/]+\/domain\/models\.ts$/;
const TABLES_FILE = /\/tables\/[^/]+\.ts$/;

/**
 * An `<Entities>TableSchema` value may only be declared in
 * `modules/<name>/domain/models.ts`, and `Table.make` may only be called under
 * `tables/`.
 */
export default defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Keep persisted field schemas in domain/models.ts and Table.make in tables/.',
    },
    messages: {
      schemaOutsideModels:
        '`{{name}}` is a persisted field schema: define it in the owning module `domain/models.ts`.',
      tableOutsideTables:
        '`Table.make` belongs in `tables/*.ts`, registering a schema defined in `domain/models.ts`.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename.replaceAll('\\', '/');
    const isModelsFile = MODELS_FILE.test(filename);
    const isTablesFile = TABLES_FILE.test(filename);
    return {
      // Every declaration, exported or not: `export { XTableSchema }` can follow later.
      VariableDeclarator(node) {
        if (isModelsFile) return;
        if (node.id.type !== 'Identifier') return;
        if (!node.id.name.endsWith('TableSchema')) return;
        context.report({
          node: node.id,
          messageId: 'schemaOutsideModels',
          data: { name: node.id.name },
        });
      },
      // `export { fields as XTableSchema }` names a schema the declaration check cannot see.
      ExportSpecifier(node) {
        if (isModelsFile) return;
        const declaration = node.parent;
        if (declaration.type !== 'ExportNamedDeclaration') return;
        // A re-export from another file declares nothing here.
        if (Predicate.isNotNull(declaration.source)) return;
        const { exported, local } = node;
        if (local.type !== 'Identifier') return;
        // `export { fields as "XTableSchema" }` names the same export.
        const exportedName =
          exported.type === 'Literal' ? exported.value : exported.name;
        if (!exportedName.endsWith('TableSchema')) return;
        if (local.name.endsWith('TableSchema')) return;
        const variable = findVariable(
          context.sourceCode.getScope(node),
          local.name
        );
        const isDeclaredHere =
          variable?.defs.some((definition) => definition.type === 'Variable') ??
          false;
        if (!isDeclaredHere) return;
        context.report({
          node: exported,
          messageId: 'schemaOutsideModels',
          data: { name: exportedName },
        });
      },
      CallExpression(node) {
        if (isTablesFile) return;
        const callee = node.callee;
        const isTableMake =
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Table' &&
          callee.property.name === 'make';
        if (!isTableMake) return;
        context.report({ node: callee, messageId: 'tableOutsideTables' });
      },
    };
  },
});
