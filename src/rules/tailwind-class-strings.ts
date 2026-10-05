import { type ESTree, defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';

import { isUtilityList } from '../tailwind-utilities.ts';

const DEFAULT_CLASS_ATTRIBUTES = '^(class|className)$';
// Mirrors `tailwindFunctions` in prettier.config.mjs and `tailwindCSS.classFunctions`.
const DEFAULT_CLASS_FUNCTIONS = [
  'cn',
  'cva',
  'cx',
  'tw',
  'clsx',
  'classNames',
  'twMerge',
];

// A name that ends as a class list does: `className`, `ROW_CLASSES`, `classNames`, `classList`.
// Not `classification`, `classify`, or a domain `petClass`.
const CLASS_NAME_HINT = /^class$|class(?:es|_?names?|list)$/i;

// A name that ends as a style holder does: `style`, `styles`, `rowStyle`. Not `styledElement`.
const STYLE_NAME = /styles?$/i;

/** True for an assignment target that is, or reaches through, a style: `rowStyle`, `element.style.x`, `element["style"].x`. */
const isStyleTarget = (target: ESTree.Node): boolean => {
  if (target.type === 'Identifier') return STYLE_NAME.test(target.name);
  if (target.type !== 'MemberExpression') return false;
  const { property } = target;
  const isPlainName = !target.computed && property.type === 'Identifier';
  const name =
    property.type === 'Literal'
      ? String(property.value)
      : isPlainName
        ? property.name
        : '';
  return STYLE_NAME.test(name) || isStyleTarget(target.object);
};

/**
 * What the string is the value of, walking up from it: something named like a class list, a
 * neutral binding, or a position that is never a class value (a key, a comparison, an argument).
 */
const bindingKind = (child: ESTree.Node): 'class' | 'neutral' | 'excluded' => {
  const current = child.parent;
  if (Predicate.isNull(current)) return 'neutral';
  // A key, a lookup key or a name selects or labels an entry; it is never the class list.
  const isKeyOrName =
    (Predicate.hasProperty(current, 'key') && current.key === child) ||
    (current.type === 'MemberExpression' && current.property === child) ||
    (current.type === 'TSEnumMember' && current.id === child) ||
    current.type === 'ExportSpecifier' ||
    current.type === 'ImportSpecifier' ||
    current.type === 'ExportAllDeclaration';
  if (isKeyOrName) return 'excluded';
  const named = (name: string) =>
    CLASS_NAME_HINT.test(name) ? 'class' : 'neutral';
  if (current.type === 'JSXAttribute')
    return current.name.type === 'JSXIdentifier'
      ? named(current.name.name)
      : 'neutral';
  if (current.type === 'VariableDeclarator')
    return current.id.type === 'Identifier'
      ? named(current.id.name)
      : 'neutral';
  // A default value: `(className = "flex gap-2") =>`.
  if (current.type === 'AssignmentPattern')
    return current.left.type === 'Identifier'
      ? named(current.left.name)
      : 'neutral';
  if (current.type === 'AssignmentExpression') {
    const { left } = current;
    if (left.type === 'Identifier') return named(left.name);
    if (left.type !== 'MemberExpression') return 'neutral';
    // `element['className']` names the property as plainly as `element.className`.
    const { property } = left;
    if (property.type === 'Literal') return named(String(property.value));
    const isPlainName = !left.computed && property.type === 'Identifier';
    return isPlainName ? named(property.name) : 'neutral';
  }
  const isMember =
    current.type === 'Property' || current.type === 'PropertyDefinition';
  const key = isMember ? current.key : null;
  // A quoted key names the member whether or not it is computed.
  const keyName = (() => {
    if (key?.type === 'Literal') return String(key.value);
    const isPlainName =
      isMember && !current.computed && key?.type === 'Identifier';
    return isPlainName ? key.name : null;
  })();
  const isHintedMember =
    Predicate.isNotNull(keyName) && CLASS_NAME_HINT.test(keyName);
  // A class-named member inside an argument (`toEqual({ className: "…" })`) is still an argument.
  if (isHintedMember)
    return bindingKind(current) === 'excluded' ? 'excluded' : 'class';
  // A string compared against something is a condition; an argument of a call or a constructor
  // (`toHaveClass("flex gap-2")`, `new Map([["active", …]])`) is not the bound value either.
  const isComparison =
    current.type === 'BinaryExpression' && current.operator !== '+';
  const isNeverTheValue =
    isComparison ||
    current.type === 'CallExpression' ||
    current.type === 'NewExpression';
  if (isNeverTheValue) return 'excluded';
  // A string inside a callback is that function's own value, not an argument of the outer call.
  const isScopeBoundary =
    current.type.endsWith('Statement') ||
    current.type === 'ArrowFunctionExpression' ||
    current.type === 'FunctionExpression' ||
    current.type === 'FunctionDeclaration';
  if (isScopeBoundary) return 'neutral';
  return bindingKind(current);
};

/**
 * Standard: "Wrap Tailwind class strings declared outside a common `className` JSX context with
 * the `tw` tagged template or compose them with `cn` from `@repo/ui` so editor
 * autocomplete and formatting can detect them."
 *
 * Detection is a heuristic: a string is treated as a Tailwind class list when every
 * whitespace-separated token is class-shaped and at least one token starts (after its variants)
 * with a known utility prefix.
 */
export default defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Wrap Tailwind class strings declared outside a `className` JSX attribute with `tw` or compose them with `cn`.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          classAttributes: { type: 'string' },
          classFunctions: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      wrap: 'Tailwind class string outside a `className` attribute. Wrap it with the `tw` tagged template or compose it with `cn` so editor tooling and the Prettier plugin can see it.',
    },
  },
  create(context) {
    const [options] = context.options;
    const attributesOption = Predicate.hasProperty(options, 'classAttributes')
      ? options.classAttributes
      : undefined;
    const classAttributes = new RegExp(
      Predicate.isString(attributesOption)
        ? attributesOption
        : DEFAULT_CLASS_ATTRIBUTES
    );
    const functionsOption = Predicate.hasProperty(options, 'classFunctions')
      ? options.classFunctions
      : undefined;
    const classFunctions = new Set(
      Array.isArray(functionsOption)
        ? functionsOption.filter(Predicate.isString)
        : DEFAULT_CLASS_FUNCTIONS
    );

    /**
     * True when tooling already recognises the position of the string `node` as a class list.
     * Called with the string's parent as `current`; walks up from there.
     */
    const isInRecognisedContext = (
      node: ESTree.Node,
      current: ESTree.Node | null,
      // True once the walk has left a function: an outer `styles` binding says nothing about
      // the strings a callback inside it declares.
      hasLeftFunction = false
    ): boolean => {
      if (Predicate.isNull(current)) return false;
      if (current.type === 'JSXAttribute')
        return (
          current.name.type === 'JSXIdentifier' &&
          // A `style` object holds CSS values (`display: 'inline flex'`), not class lists.
          (classAttributes.test(current.name.name) ||
            (current.name.name === 'style' && !hasLeftFunction))
        );
      // A `style`-named constant or parameter default holds CSS.
      const boundName =
        current.type === 'VariableDeclarator'
          ? current.id
          : current.type === 'AssignmentPattern'
            ? current.left
            : null;
      const isStyleBinding =
        boundName?.type === 'Identifier' && STYLE_NAME.test(boundName.name);
      const isMember =
        current.type === 'Property' || current.type === 'PropertyDefinition';
      // `style`, `"style"`, `["style"]` and `rowStyles` all name a style member.
      const isStyleMember =
        isMember &&
        (current.key.type === 'Literal'
          ? STYLE_NAME.test(String(current.key.value))
          : !current.computed &&
            current.key.type === 'Identifier' &&
            STYLE_NAME.test(current.key.name));
      const isStyleAssignment =
        current.type === 'AssignmentExpression' && isStyleTarget(current.left);
      const holdsCss =
        !hasLeftFunction &&
        (isStyleBinding || isStyleMember || isStyleAssignment);
      if (holdsCss) return true;
      // A call is named by its callee, or by the property a member callee ends in.
      const callee = current.type === 'CallExpression' ? current.callee : null;
      const calleeProperty =
        callee?.type === 'MemberExpression' ? callee.property : callee;
      const calleeName =
        calleeProperty?.type === 'Identifier' ? calleeProperty.name : '';
      const isClassFunctionCall =
        Predicate.isNotNull(callee) && classFunctions.has(calleeName);
      if (isClassFunctionCall) return true;
      const isClassFunctionTag =
        current.type === 'TaggedTemplateExpression' &&
        current.tag.type === 'Identifier' &&
        classFunctions.has(current.tag.name);
      if (isClassFunctionTag) return true;
      const isModuleSource =
        (current.type === 'ImportDeclaration' ||
          current.type === 'ExportNamedDeclaration' ||
          current.type === 'ExportAllDeclaration') &&
        current.source === node;
      if (isModuleSource) return true;
      const isNeverClassList =
        current.type === 'TSLiteralType' || current.type === 'ImportExpression';
      if (isNeverClassList) return true;
      const isFunction =
        current.type === 'ArrowFunctionExpression' ||
        current.type === 'FunctionExpression' ||
        current.type === 'FunctionDeclaration';
      return isInRecognisedContext(
        node,
        current.parent,
        hasLeftFunction || isFunction
      );
    };

    return {
      Literal(node) {
        const { value, parent } = node;
        if (typeof value !== 'string') return;
        if (value.trim() === '') return;
        const binding = bindingKind(node);
        if (binding === 'excluded') return;
        // Either the binding's name says so, or every word is a utility Tailwind generates.
        const isClassList = binding === 'class' || isUtilityList(value);
        if (!isClassList) return;
        if (isInRecognisedContext(node, parent)) return;
        context.report({ node, messageId: 'wrap' });
      },
      TemplateLiteral(node) {
        const text = node.quasis
          .map((quasi) => quasi.value.cooked ?? '')
          .join(' ');
        // `${base} ${tone}` has no text of its own but still builds a class list.
        const isEmpty = text.trim() === '' && node.expressions.length === 0;
        if (isEmpty) return;
        const binding = bindingKind(node);
        if (binding === 'excluded') return;
        const isClassList = binding === 'class' || isUtilityList(text);
        if (!isClassList) return;
        if (isInRecognisedContext(node, node.parent)) return;
        context.report({ node, messageId: 'wrap' });
      },
    };
  },
});
