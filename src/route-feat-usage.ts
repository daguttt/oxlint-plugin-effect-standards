import fs from 'node:fs';
import path from 'node:path';

import * as Predicate from 'effect/Predicate';
import ts from 'typescript';

import { ROUTES_MARKER, resolveRouteSpecifier } from './route-path.ts';

export const SOURCE_FILE = /\.[cm]?[jt]sx?$/;
export const NON_SOURCE_FILE =
  /\.(test|spec)\.[cm]?[jt]sx?$|\.gen\.[cm]?[jt]sx?$/;
/** `…/-feat/index.ts` and `…/-feat` name the same barrel. */
export const BARREL_INDEX = /[\\/]index(\.[cm]?[jt]sx?)?$/;
/**
 * Trailing file name parts that add nothing to the route path:
 * `shelter.lazy.tsx` and `shelter.index.tsx` are both `shelter`.
 */
const PATHLESS_FILE_SUFFIXES = new Set([
  'index',
  'route',
  'lazy',
  'component',
  'errorComponent',
  'pendingComponent',
  'notFoundComponent',
  'loader',
  '__root',
]);

export const isInside = (directory: string, ancestor: string) =>
  directory.startsWith(ancestor + path.sep);

/** `…/src/routes`, or null for a path outside it. */
export const toRoutesRoot = (filename: string): string | null => {
  const routesAt = `${filename}${path.sep}`.lastIndexOf(ROUTES_MARKER);
  return routesAt === -1
    ? null
    : filename.slice(0, routesAt + ROUTES_MARKER.length - 1);
};

/**
 * The route a file belongs to, as the folder path its name spells out: a dot
 * nests like a folder, so `pets.edit.tsx` and `pets.edit/route.tsx` are both
 * `pets/edit`. A file inside a `-`-prefixed folder belongs to the route
 * holding that folder. Null outside `src/routes/`.
 */
export const toRouteDirectory = (filename: string): string | null => {
  const routesRoot = toRoutesRoot(filename);
  if (Predicate.isNull(routesRoot)) return null;
  const segments = path
    .dirname(filename)
    .slice(routesRoot.length)
    .split(path.sep)
    .filter((segment) => segment.length > 0);
  const firstPrivate = segments.findIndex((segment) => segment.startsWith('-'));
  const folderSegments = (
    firstPrivate === -1 ? segments : segments.slice(0, firstPrivate)
  ).flatMap((segment) => segment.split('.'));
  if (firstPrivate !== -1) return path.join(routesRoot, ...folderSegments);
  const nameSegments = path
    .basename(filename)
    .replace(SOURCE_FILE, '')
    .split('.');
  // Only at the end: `shelter.route.edit.tsx` is a route under `shelter/route`.
  const fileSegments = nameSegments.slice(
    0,
    nameSegments.findLastIndex(
      (segment) => !PATHLESS_FILE_SUFFIXES.has(segment)
    ) + 1
  );
  const isPrivateFile = fileSegments[0]?.startsWith('-') === true;
  return path.join(
    routesRoot,
    ...folderSegments,
    ...(isPrivateFile ? [] : fileSegments)
  );
};

/** The text of `'name'` or `` `name` ``; null for anything computed at run time. */
const toLiteralText = (node: ts.Node | undefined): string | null => {
  const isLiteral =
    Predicate.isNotUndefined(node) &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node));
  return isLiteral ? node.text : null;
};

/** Looks through parentheses, `!`, `as` and `satisfies`, which do not change the value. */
const unwrap = (node: ts.Node): ts.Node => {
  const isWrapper =
    ts.isParenthesizedExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node);
  return isWrapper ? unwrap(node.expression) : node;
};

/** The export a property name reads: `name`, `'name'` or `['name']`. */
const toPropertyName = (node: ts.Node): string | null => {
  if (ts.isIdentifier(node)) return node.text;
  return toLiteralText(
    ts.isComputedPropertyName(node) ? node.expression : node
  );
};

/**
 * For the route owning a `-feat` and each route under it, the export names it
 * reads from that `-feat`'s barrel. What a file inside the `-feat` imports
 * from its neighbours counts as read by the owner. Files are parsed as saved.
 */
export const readFeatUsage = (
  featDirectory: string,
  owner: string
): ReadonlyMap<string, ReadonlySet<string>> => {
  const usage = new Map<string, Set<string>>();
  // Listed from the routes root: a flat file (`shelter.rooms.tsx`) or a dotted
  // folder (`shelter.$id/`) sits beside the owner's folder, not inside it.
  const files = fs
    .readdirSync(toRoutesRoot(owner) ?? owner, {
      withFileTypes: true,
      recursive: true,
    })
    .filter(
      (entry) =>
        entry.isFile() &&
        SOURCE_FILE.test(entry.name) &&
        !NON_SOURCE_FILE.test(entry.name)
    )
    .map((entry) => path.join(entry.parentPath, entry.name));

  for (const file of files) {
    const isFeatFile = isInside(file, featDirectory);
    const route = isFeatFile ? owner : toRouteDirectory(file);
    if (Predicate.isNull(route)) continue;
    const isUnderOwner = route === owner || isInside(route, owner);
    if (!isUnderOwner) continue;

    const sourceFile = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      false,
      file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const names = usage.get(route) ?? new Set<string>();
    usage.set(route, names);
    const namespaces = new Set<string>();

    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      const bindings = statement.importClause?.namedBindings;
      if (Predicate.isUndefined(bindings)) continue;
      const isNeighbourImport =
        isFeatFile && specifier.startsWith('.') && ts.isNamedImports(bindings);
      if (isNeighbourImport) {
        for (const element of bindings.elements)
          names.add((element.propertyName ?? element.name).text);
        continue;
      }
      if (!ts.isNamespaceImport(bindings)) continue;
      const target = resolveRouteSpecifier(specifier, file);
      if (target?.replace(BARREL_INDEX, '') === featDirectory)
        namespaces.add(bindings.name.text);
    }
    if (namespaces.size === 0) continue;

    const isNamespace = (node: ts.Node | undefined) => {
      if (Predicate.isUndefined(node)) return false;
      const inner = unwrap(node);
      return ts.isIdentifier(inner) && namespaces.has(inner.text);
    };
    const visit = (node: ts.Node): void => {
      const read = ((): ReadonlyArray<string | null> => {
        if (ts.isPropertyAccessExpression(node))
          return isNamespace(node.expression) ? [node.name.text] : [];
        if (ts.isElementAccessExpression(node))
          return isNamespace(node.expression)
            ? [toLiteralText(node.argumentExpression)]
            : [];
        if (ts.isQualifiedName(node))
          return isNamespace(node.left) ? [node.right.text] : [];
        const isDeclared =
          ts.isVariableDeclaration(node) &&
          ts.isObjectBindingPattern(node.name) &&
          isNamespace(node.initializer);
        if (isDeclared)
          return node.name.elements.map((element) =>
            toPropertyName(element.propertyName ?? element.name)
          );
        // `({ name } = XRouteFeat)` assigns to an object literal.
        const isAssignedFromNamespace =
          ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          isNamespace(node.right);
        const target = isAssignedFromNamespace ? unwrap(node.left) : null;
        const isAssigned =
          Predicate.isNotNull(target) && ts.isObjectLiteralExpression(target);
        return isAssigned
          ? target.properties.map((property) =>
              Predicate.isUndefined(property.name)
                ? null
                : toPropertyName(property.name)
            )
          : [];
      })();
      for (const name of read.filter(Predicate.isNotNull)) names.add(name);
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return usage;
};
