import path from 'node:path';

import { defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';

import { locate } from '../confect-module-path.ts';

const capitalize = (value: string) =>
  `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

/**
 * Backend module and cross-layer APIs are namespace imports:
 *   module barrel        -> `<Module>`          (`CustomerAssignmentWorkflows`)
 *   cross-module layer   -> `<Module><Layer>`   (`CustomersDomain`)
 *   intra-module layer   -> `<Layer>`           (`Domain`)
 * Within the same layer, files use plain named imports.
 */
export default defineRule({
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      notNamespace:
        "Import {{what}} '{{source}}' with namespace syntax: `import * as {{expected}} from '{{source}}'`.",
      wrongName:
        "Namespace '{{actual}}' for {{what}} '{{source}}' should be named '{{expected}}'.",
      sameLayerNamespace:
        "'{{source}}' is in the same layer; use plain named imports (`import { identifier } from '{{source}}'`).",
    },
  },
  create(context) {
    const filename = context.filename;
    const importer = locate(filename);
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (!source.startsWith('.')) return;
        const [first] = node.specifiers;
        if (Predicate.isUndefined(first)) return;
        const target = locate(path.resolve(path.dirname(filename), source));
        if (Predicate.isNull(target)) return;
        const { layer } = target;
        // A file directly under the module root is neither barrel nor layer.
        const isLooseModuleFile =
          Predicate.isNull(layer) && Predicate.isNotNull(target.rest);
        if (isLooseModuleFile) return;

        const isNamespace =
          node.specifiers.length === 1 &&
          first.type === 'ImportNamespaceSpecifier';
        const isSameModule = importer?.module === target.module;
        const isSameLayer =
          isSameModule &&
          Predicate.isNotNull(layer) &&
          importer?.layer === layer;

        if (isSameLayer) {
          if (!isNamespace) return;
          context.report({
            node: first.local,
            messageId: 'sameLayerNamespace',
            data: { source },
          });
          return;
        }

        const { expected, what } = Predicate.isNull(layer)
          ? { expected: capitalize(target.module), what: 'module barrel' }
          : isSameModule
            ? { expected: capitalize(layer), what: 'intra-module layer' }
            : {
                expected: `${capitalize(target.module)}${capitalize(layer)}`,
                what: 'cross-module layer',
              };

        if (!isNamespace) {
          context.report({
            node,
            messageId: 'notNamespace',
            data: { source, expected, what },
          });
          return;
        }
        const actual = first.local.name;
        // Case-insensitive so acronyms keep their casing (`WorkOS`).
        const isExpectedName =
          actual.toLowerCase() === expected.toLowerCase() &&
          /^[A-Z]/.test(actual);
        if (isExpectedName) return;
        context.report({
          node: first.local,
          messageId: 'wrongName',
          data: { source, expected, actual, what },
        });
      },
    };
  },
});
