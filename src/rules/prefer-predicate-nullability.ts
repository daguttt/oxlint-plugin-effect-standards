import { type ESTree, type Fixer, defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';

import { unwrap } from '../ast.ts';
import { findVariable } from '../scope.ts';

const PREDICATE_IMPORT = "import * as Predicate from 'effect/Predicate';";

type EqualityOperator = '===' | '!==' | '==' | '!=';

const isEqualityOperator = (operator: string): operator is EqualityOperator =>
  operator === '===' ||
  operator === '!==' ||
  operator === '==' ||
  operator === '!=';

const REFINEMENT_BY_COMPARISON = {
  'null ===': 'isNull',
  'null !==': 'isNotNull',
  'undefined ===': 'isUndefined',
  'undefined !==': 'isNotUndefined',
  // Loose equality matches both null and undefined, whichever literal is written.
  'null ==': 'isNullish',
  'null !=': 'isNotNullish',
  'undefined ==': 'isNullish',
  'undefined !=': 'isNotNullish',
};

type Operand = ESTree.BinaryExpression['left' | 'right'];

type Match =
  | { kind: 'null'; operand: Operand }
  | { kind: 'undefined'; operand: Operand; nullish: ESTree.IdentifierReference }
  | { kind: 'typeof'; operand: Operand };

/** How `Predicate` resolves where the comparison sits. */
type PredicateBinding = 'effect' | 'other' | 'absent';

type Pending = {
  node: ESTree.BinaryExpression;
  operand: Operand;
  refinement: string;
  nullish: string;
  binding: PredicateBinding;
};

/** Describes the nullish side of a comparison, or returns null when neither side is nullish. */
const classify = (node: ESTree.BinaryExpression): Match | null => {
  const sides: ReadonlyArray<readonly [Operand, Operand]> = [
    [node.left, node.right],
    [node.right, node.left],
  ];
  for (const [nullish, operand] of sides) {
    const isNullLiteral = nullish.type === 'Literal' && nullish.raw === 'null';
    if (isNullLiteral) return { kind: 'null', operand };
    const isUndefinedIdentifier =
      nullish.type === 'Identifier' && nullish.name === 'undefined';
    if (isUndefinedIdentifier) return { kind: 'undefined', operand, nullish };
    const isUndefinedString =
      nullish.type === 'Literal' && nullish.value === 'undefined';
    if (!isUndefinedString) continue;
    const isTypeof =
      operand.type === 'UnaryExpression' && operand.operator === 'typeof';
    if (isTypeof) return { kind: 'typeof', operand: operand.argument };
  }
  return null;
};

/** True for a binding with no runtime value: a type, a `declare`d name, a bodiless signature, or anything inside a `declare` block. */
const isAmbient = (node: ESTree.Node | null): boolean => {
  if (Predicate.isNull(node)) return false;
  const isTypeOnlyImport =
    (node.type === 'ImportSpecifier' || node.type === 'ImportDeclaration') &&
    node.importKind === 'type';
  const isTypeOnly =
    isTypeOnlyImport ||
    node.type === 'TSDeclareFunction' ||
    node.type === 'TSTypeAliasDeclaration' ||
    node.type === 'TSInterfaceDeclaration';
  if (isTypeOnly) return true;
  const isDeclared =
    Predicate.hasProperty(node, 'declare') && node.declare === true;
  return isDeclared || isAmbient(node.parent);
};

/** Inserts the namespace import after the last import, else after the directive prologue. */
const insertPredicateImport = (
  fixer: Fixer,
  program: ESTree.Program,
  sourceText: string
) => {
  const lastImport = program.body.findLast(
    (statement) => statement.type === 'ImportDeclaration'
  );
  if (Predicate.isNotUndefined(lastImport)) {
    return fixer.insertTextAfter(lastImport, `\n${PREDICATE_IMPORT}`);
  }
  const lastDirective = program.body.findLast(
    (statement) =>
      statement.type === 'ExpressionStatement' &&
      typeof statement.directive === 'string'
  );
  if (Predicate.isNotUndefined(lastDirective)) {
    return fixer.insertTextAfter(lastDirective, `\n${PREDICATE_IMPORT}`);
  }
  // A hashbang must stay on the first line.
  const start = sourceText.startsWith('#!') ? sourceText.indexOf('\n') + 1 : 0;
  const hasOnlyHashbang = sourceText.startsWith('#!') && start === 0;
  return hasOnlyHashbang
    ? fixer.insertTextAfterRange(
        [sourceText.length, sourceText.length],
        `\n${PREDICATE_IMPORT}`
      )
    : fixer.insertTextBeforeRange([start, start], `${PREDICATE_IMPORT}\n`);
};

export default defineRule({
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        "Check nullability with Effect's Predicate refinements instead of raw equality comparisons.",
    },
    messages: {
      preferRefinement:
        'Use `Predicate.{{refinement}}({{operand}})` instead of a raw `{{operator}} {{nullish}}` comparison.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const pending: Array<Pending> = [];

    return {
      BinaryExpression(node) {
        const comparison = node.operator;
        if (!isEqualityOperator(comparison)) return;
        const match = classify(node);
        if (Predicate.isNull(match)) return;

        // A local binding named `undefined` is not the global sentinel.
        const isShadowedUndefined =
          match.kind === 'undefined' &&
          Predicate.isNotNull(
            findVariable(sourceCode.getScope(match.nullish), match.nullish.name)
          );
        if (isShadowedUndefined) return;

        // `typeof x` is the only safe probe for a global that may not exist; calling a function with it throws.
        const isGlobalProbe = (() => {
          if (match.kind !== 'typeof') return false;
          // `typeof (x as T)` probes `x` all the same.
          const probed = unwrap(match.operand);
          if (probed.type !== 'Identifier') return false;
          const variable = findVariable(
            sourceCode.getScope(probed),
            probed.name
          );
          if (Predicate.isNull(variable)) return true;
          // An ambient declaration promises nothing at runtime.
          return variable.defs.every((definition) =>
            isAmbient(definition.node)
          );
        })();
        if (isGlobalProbe) return;

        const nullish = match.kind === 'typeof' ? 'undefined' : match.kind;
        // `typeof x == 'undefined'` is strict in effect, so both spellings map to the strict refinement.
        const strictComparison = comparison.startsWith('!') ? '!==' : '===';
        const operator =
          match.kind === 'typeof' ? strictComparison : comparison;
        const predicateVariable = findVariable(
          sourceCode.getScope(node),
          'Predicate'
        );
        const binding: PredicateBinding = (() => {
          if (Predicate.isNull(predicateVariable)) return 'absent';
          // Only a value import of Effect's module: `* as Predicate` from its path, or `{ Predicate }` from the barrel.
          const isEffectImport = predicateVariable.defs.some((definition) => {
            if (definition.type !== 'ImportBinding') return false;
            const { node: specifier, parent: declaration } = definition;
            if (declaration?.type !== 'ImportDeclaration') return false;
            if (declaration.importKind === 'type') return false;
            const source = declaration.source.value;
            if (specifier.type === 'ImportNamespaceSpecifier')
              return source === 'effect/Predicate';
            if (specifier.type !== 'ImportSpecifier') return false;
            if (specifier.importKind === 'type') return false;
            if (source !== 'effect') return false;
            return (
              specifier.imported.type === 'Identifier' &&
              specifier.imported.name === 'Predicate'
            );
          });
          return isEffectImport ? 'effect' : 'other';
        })();
        pending.push({
          binding,
          node,
          operand: match.operand,
          refinement: REFINEMENT_BY_COMPARISON[`${nullish} ${operator}`],
          nullish: match.kind === 'typeof' ? "typeof 'undefined'" : nullish,
        });
      },
      'Program:exit'(program) {
        const reports = pending
          .toSorted((a, b) => a.node.range[0] - b.node.range[0])
          .map((entry) => ({
            ...entry,
            // A comment inside the comparison would be lost, and a `Predicate` that is not Effect's must not be called.
            isFixable:
              entry.binding !== 'other' &&
              sourceCode.getCommentsInside(entry.node).length === 0,
          }));
        // Only one fix carries the import, so the fixes never overlap.
        const importCarrier = reports.find(
          (entry) => entry.isFixable && entry.binding === 'absent'
        );
        reports.forEach((entry) => {
          const { node, operand, refinement, nullish, isFixable } = entry;
          const operandText = sourceCode.getText(operand);
          // `(a, b) === null` tests `b`; without the parentheses the call would test `a`.
          const argumentText =
            operand.type === 'SequenceExpression'
              ? `(${operandText})`
              : operandText;
          context.report({
            node,
            messageId: 'preferRefinement',
            data: {
              refinement,
              operand: operandText.length > 40 ? '…' : operandText,
              operator: node.operator,
              nullish,
            },
            fix: (fixer) =>
              isFixable
                ? [
                    ...(entry === importCarrier
                      ? [insertPredicateImport(fixer, program, sourceCode.text)]
                      : []),
                    fixer.replaceText(
                      node,
                      `Predicate.${refinement}(${argumentText})`
                    ),
                  ]
                : null,
          });
        });
      },
    };
  },
});
