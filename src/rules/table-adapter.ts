import { type ESTree, defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';

const unwrapChain = (
  node: ESTree.ExportDefaultDeclarationKind
): ESTree.ExportDefaultDeclarationKind => {
  if (node.type !== 'CallExpression') return node;
  if (node.callee.type !== 'MemberExpression') return node;
  if (node.callee.object.type !== 'CallExpression') return node;
  return unwrapChain(node.callee.object);
};

const TABLE_FILE = /\/confect\/tables\/[^/]+\.ts$/;

/**
 * `confect/tables/*.ts` files are adapters: the default export is
 * `Table.make(() => <X>Domain.<Y>TableSchema)` followed only by chained
 * index declarations. Files anywhere else are ignored.
 */
export default defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require table files to register a domain-owned <Entities>TableSchema.',
    },
    messages: {
      notAdapter:
        'A table file is an adapter: default-export `Table.make(() => <Module>Domain.<Entities>TableSchema)` and chain its indexes. Define the fields in the owning module `domain/models.ts`.',
      missingDefault:
        'A table file must default-export `Table.make(() => <Module>Domain.<Entities>TableSchema)`.',
    },
    schema: [],
  },
  create(context) {
    if (!TABLE_FILE.test(context.filename.replaceAll('\\', '/'))) return {};
    return {
      ExportDefaultDeclaration(node) {
        const root = unwrapChain(node.declaration);
        const isTableMake =
          root.type === 'CallExpression' &&
          root.callee.type === 'MemberExpression' &&
          !root.callee.computed &&
          root.callee.object.type === 'Identifier' &&
          root.callee.object.name === 'Table' &&
          root.callee.property.name === 'make';
        const thunk = isTableMake ? root.arguments[0] : undefined;
        const isDomainTableSchemaThunk =
          Predicate.isNotUndefined(thunk) &&
          thunk.type === 'ArrowFunctionExpression' &&
          thunk.params.length === 0 &&
          thunk.body.type === 'MemberExpression' &&
          !thunk.body.computed &&
          thunk.body.object.type === 'Identifier' &&
          thunk.body.object.name.endsWith('Domain') &&
          thunk.body.property.type === 'Identifier' &&
          thunk.body.property.name.endsWith('TableSchema');
        const isAdapter = isTableMake && isDomainTableSchemaThunk;
        if (isAdapter) return;
        context.report({ node: node.declaration, messageId: 'notAdapter' });
      },
      'Program:exit'(node) {
        const hasDefaultExport = node.body.some(
          (statement) => statement.type === 'ExportDefaultDeclaration'
        );
        if (hasDefaultExport) return;
        context.report({ node, messageId: 'missingDefault' });
      },
    };
  },
});
