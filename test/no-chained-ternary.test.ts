import rule from '../src/rules/no-chained-ternary.ts';
import { moduleTester, tsxTester } from './tester.ts';

moduleTester.run('no-chained-ternary', rule, {
  valid: [
    {
      name: 'a single ternary',
      code: 'const label = isActive ? "on" : "off";',
    },
    {
      name: 'a ternary in the test',
      code: 'const label = (a ? b : c) ? "on" : "off";',
    },
    {
      name: 'a ternary inside a call argument in a branch',
      code: 'const label = a ? format(b ? 1 : 2) : "none";',
    },
    {
      name: 'a ternary inside an object literal in a branch',
      code: 'const props = a ? { tone: b ? "red" : "blue" } : undefined;',
    },
    {
      name: 'a ternary behind a type assertion in a branch',
      code: 'const label = a ? ((b ? 1 : 2) as number) : 3;',
    },
    {
      name: 'an IIFE with early returns',
      code: 'const label = (() => { if (a) return "a"; if (b) return "b"; return "c"; })();',
    },
  ],
  invalid: [
    {
      name: 'chained in the alternate',
      code: 'const label = a ? "a" : b ? "b" : "c";',
      errors: [{ messageId: 'chainedTernary', column: 14 }],
    },
    {
      name: 'nested in the consequent',
      code: 'const label = a ? (b ? "ab" : "a") : "none";',
      errors: [{ messageId: 'chainedTernary', column: 14 }],
    },
    {
      name: 'parentheses do not exempt a nested branch',
      code: 'const label = a ? "a" : (b ? "b" : "c");',
      errors: [{ messageId: 'chainedTernary' }],
    },
    {
      name: 'each ternary with a ternary branch is reported, as in ESLint',
      code: 'const label = a ? "a" : b ? "b" : c ? "c" : "d";',
      errors: [
        { messageId: 'chainedTernary', column: 14 },
        { messageId: 'chainedTernary', column: 24 },
      ],
    },
    {
      name: 'a chain inside a call argument is reported on its own',
      code: 'const label = format(a ? 1 : b ? 2 : 3);',
      errors: [{ messageId: 'chainedTernary', column: 21 }],
    },
  ],
});

tsxTester.run('no-chained-ternary (tsx)', rule, {
  valid: [
    {
      name: 'a single ternary in JSX',
      code: 'const view = <div>{loading ? <Spinner /> : <List />}</div>;',
    },
    {
      name: 'a ternary inside a JSX child of a branch',
      code: 'const view = open ? <Panel>{loading ? <Spinner /> : <List />}</Panel> : null;',
    },
  ],
  invalid: [
    {
      name: 'a chain in a JSX expression',
      code: 'const view = <div>{loading ? <Spinner /> : empty ? <Empty /> : <List />}</div>;',
      errors: [{ messageId: 'chainedTernary' }],
    },
  ],
});
