import path from 'node:path';

import { type ESTree, defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';

import { type Layer, locate } from '../confect-module-path.ts';

const FORBIDDEN_LAYERS: Record<Layer, ReadonlyArray<Layer>> = {
  domain: ['application', 'infrastructure', 'presentation'],
  application: ['infrastructure', 'presentation'],
  presentation: ['application', 'infrastructure'],
  infrastructure: ['presentation'],
};

// The entry name, without an extension: `_generated/docs.ts` is `docs`.
const GENERATED = /(?:^|\/)_generated\/([^/.]+)/;

type ModuleEdge =
  | ESTree.ImportDeclaration
  | ESTree.ExportNamedDeclaration
  | ESTree.ExportAllDeclaration;

const isTypeOnly = (node: ModuleEdge) => {
  if (node.type === 'ExportAllDeclaration') return node.exportKind === 'type';
  if (node.type === 'ImportDeclaration')
    return (
      node.importKind === 'type' ||
      (node.specifiers.length > 0 &&
        node.specifiers.every(
          (specifier) =>
            specifier.type === 'ImportSpecifier' &&
            specifier.importKind === 'type'
        ))
    );
  return (
    node.exportKind === 'type' ||
    (node.specifiers.length > 0 &&
      node.specifiers.every((specifier) => specifier.exportKind === 'type'))
  );
};

/**
 * Confect module layers depend inward: `infrastructure → application → domain`
 * and `presentation → domain`. Infrastructure and presentation never import
 * each other. Domain is pure: it reaches another module only through that
 * module's `domain`, and its only `_generated` imports are `_generated/id` and
 * type-only imports from `_generated/docs`.
 */
export default defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Keep Confect module layers pointing inward and the domain layer pure.',
    },
    messages: {
      forbiddenLayer:
        '`{{from}}` must not import `{{to}}`. Layers depend inward: `infrastructure → application → domain` and `presentation → domain`; infrastructure and presentation never import each other.',
      domainBarrel:
        'Domain code must not import the `{{module}}` module barrel: the barrel pulls in application and infrastructure. Import `modules/{{module}}/domain`, or a sibling file when it is this module.',
      domainGenerated:
        'Domain is pure: its only `_generated` imports are `_generated/id` and type-only imports from `_generated/docs`.',
      domainGeneratedDocs:
        'Domain may import `_generated/docs` only with `import type`.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    const importer = locate(filename);
    if (Predicate.isNull(importer)) return {};
    const importerLayer = importer.layer;
    if (Predicate.isNull(importerLayer)) return {};

    const check = (node: ModuleEdge) => {
      if (Predicate.isNullish(node.source)) return;
      const source = node.source.value;

      const generated = GENERATED.exec(source);
      if (Predicate.isNotNull(generated)) {
        if (importerLayer !== 'domain') return;
        const [, entry] = generated;
        if (entry === 'id') return;
        if (entry !== 'docs') {
          context.report({ node, messageId: 'domainGenerated' });
          return;
        }
        if (isTypeOnly(node)) return;
        context.report({ node, messageId: 'domainGeneratedDocs' });
        return;
      }

      if (!source.startsWith('.')) return;
      const target = locate(path.resolve(path.dirname(filename), source));
      if (Predicate.isNull(target)) return;

      const isBarrel =
        Predicate.isNull(target.layer) && Predicate.isNull(target.rest);
      if (isBarrel) {
        // Its own barrel re-exports application and infrastructure just as a foreign one does.
        if (importerLayer === 'domain') {
          context.report({
            node,
            messageId: 'domainBarrel',
            data: { module: target.module },
          });
        }
        return;
      }
      if (Predicate.isNull(target.layer)) return;
      if (!FORBIDDEN_LAYERS[importerLayer].includes(target.layer)) return;
      context.report({
        node,
        messageId: 'forbiddenLayer',
        data: { from: importerLayer, to: target.layer },
      });
    };

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
});
