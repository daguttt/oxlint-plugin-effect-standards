import fs from 'node:fs';
import path from 'node:path';

import { type ESTree, defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';

import { unwrap } from '../ast.ts';
import {
  BARREL_INDEX,
  NON_SOURCE_FILE,
  SOURCE_FILE,
  isInside,
  readFeatUsage,
  toRouteDirectory,
  toRoutesRoot,
} from '../route-feat-usage.ts';
import { resolveRouteSpecifier } from '../route-path.ts';
import { findVariable } from '../scope.ts';

const FEAT_SEGMENT = '-feat';

type AncestorFeat = { readonly featDirectory: string; readonly owner: string };

/**
 * A route's `-feat` is for that route and the routes nested under it. Code two
 * routes share, where neither contains the other, lives in a `#modules/*`
 * module, not in a common ancestor's `-feat` that does not use it itself.
 *
 * Who else uses an export is read from the files on disk, so an unsaved edit
 * in another file is not seen until it is saved.
 */
export default defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Only a route and the routes nested under it use its `-feat`; code shared by sibling routes lives in `#modules/*`.',
    },
    schema: [],
    messages: {
      outsideRoute:
        'Only `{{owner}}` and the routes nested under it may use its `-feat`. Move what `{{importer}}` needs into a `#modules/*` module.',
      parkedInAncestor:
        '`{{name}}` in `{{owner}}/-feat` is used by `{{route}}` and `{{otherRoute}}` but not by `{{owner}}` itself. Move it into a `#modules/*` module.',
    },
  },
  create(context) {
    const filename = context.physicalFilename;
    const isChecked =
      SOURCE_FILE.test(filename) && !NON_SOURCE_FILE.test(filename);
    if (!isChecked) return {};
    const routeDirectory = toRouteDirectory(filename);

    /** Ancestor routes' `-feat`s, by the import declaration naming them. */
    const ancestorFeats = new Map<ESTree.Node, AncestorFeat>();
    const usageByFeat = new Map<string, ReturnType<typeof readFeatUsage>>();
    const reported = new Set<string>();

    /**
     * Reports the export `key` reads from `source` when `source` is an
     * ancestor's `-feat` that only parks it. A key computed at run time names
     * no export.
     */
    const checkUse = (
      node: ESTree.Node,
      source: ESTree.Node,
      key: ESTree.Node,
      computed: boolean
    ) => {
      if (Predicate.isNull(routeDirectory)) return;
      // Parentheses, `!`, `as` and `satisfies` leave the namespace what it is.
      const namespace =
        source.type === 'JSXIdentifier'
          ? source
          : unwrap(source as ESTree.Argument);
      const isNamespaceName =
        namespace.type === 'Identifier' || namespace.type === 'JSXIdentifier';
      if (!isNamespaceName) return;
      const name = (() => {
        const isPlainName =
          !computed &&
          (key.type === 'Identifier' || key.type === 'JSXIdentifier');
        if (isPlainName) return key.name;
        if (key.type === 'Literal')
          return typeof key.value === 'string' ? key.value : null;
        const isStaticTemplate =
          key.type === 'TemplateLiteral' && key.expressions.length === 0;
        return isStaticTemplate ? (key.quasis[0]?.value.cooked ?? null) : null;
      })();
      if (Predicate.isNull(name)) return;
      // Resolved through scope: a local binding may shadow the namespace.
      const feat = findVariable(
        context.sourceCode.getScope(namespace),
        namespace.name
      )
        ?.defs.map((definition) => definition.parent)
        .filter(Predicate.isNotNullish)
        .map((declaration) => ancestorFeats.get(declaration))
        .find(Predicate.isNotUndefined);
      if (Predicate.isUndefined(feat)) return;
      const { featDirectory, owner } = feat;
      const reportKey = `${featDirectory}:${name}`;
      if (reported.has(reportKey)) return;
      reported.add(reportKey);

      const usage =
        usageByFeat.get(featDirectory) ?? readFeatUsage(featDirectory, owner);
      usageByFeat.set(featDirectory, usage);
      const isUsedByOwner = usage.get(owner)?.has(name) === true;
      if (isUsedByOwner) return;
      const otherRoute = [...usage.entries()].find(([route, names]) => {
        const isUnrelatedRoute =
          route !== routeDirectory &&
          !isInside(route, routeDirectory) &&
          !isInside(routeDirectory, route);
        return isUnrelatedRoute && names.has(name);
      })?.[0];
      if (Predicate.isUndefined(otherRoute)) return;
      context.report({
        node,
        messageId: 'parkedInAncestor',
        data: {
          name,
          owner: path.basename(owner),
          route: path.relative(owner, routeDirectory),
          otherRoute: path.relative(owner, otherRoute),
        },
      });
    };

    return {
      // Collected up front: an import may follow the code that uses it.
      Program(program) {
        for (const statement of program.body) {
          if (statement.type !== 'ImportDeclaration') continue;
          const target = resolveRouteSpecifier(
            statement.source.value,
            filename
          );
          if (Predicate.isNull(target)) continue;
          const featDirectory = target.replace(BARREL_INDEX, '');
          // A file named `-feat.ts` is not a `-feat/` directory.
          const isFeatBarrel =
            path.basename(featDirectory) === FEAT_SEGMENT &&
            fs
              .statSync(featDirectory, { throwIfNoEntry: false })
              ?.isDirectory() === true;
          if (!isFeatBarrel) continue;
          const owner = toRouteDirectory(path.join(featDirectory, 'index.ts'));
          if (Predicate.isNull(owner)) continue;
          const isOwnRoute = routeDirectory === owner;
          if (isOwnRoute) continue;
          const isNestedRoute =
            Predicate.isNotNull(routeDirectory) &&
            isInside(routeDirectory, owner);
          if (isNestedRoute) {
            ancestorFeats.set(statement, { featDirectory, owner });
            continue;
          }
          const routesRoot = toRoutesRoot(owner) ?? owner;
          context.report({
            node: statement.source,
            messageId: 'outsideRoute',
            data: {
              owner: path.relative(routesRoot, owner),
              importer: Predicate.isNull(routeDirectory)
                ? path.relative(path.dirname(routesRoot), filename)
                : path.relative(routesRoot, routeDirectory),
            },
          });
        }
      },
      MemberExpression(node) {
        checkUse(node, node.object, node.property, node.computed);
      },
      JSXMemberExpression(node) {
        checkUse(node, node.object, node.property, false);
      },
      TSQualifiedName(node) {
        checkUse(node, node.left, node.right, false);
      },
      // `const { name } = XRouteFeat` and `({ name } = XRouteFeat)` read `name` too.
      ObjectPattern(node) {
        const { parent } = node;
        const source = (() => {
          if (parent.type === 'VariableDeclarator') return parent.init;
          return parent.type === 'AssignmentExpression' ? parent.right : null;
        })();
        if (Predicate.isNullish(source)) return;
        for (const property of node.properties) {
          if (property.type === 'Property')
            checkUse(property, source, property.key, property.computed);
        }
      },
    };
  },
});
