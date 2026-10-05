import rule from '../src/rules/no-else.ts';
import { moduleTester as tester } from './tester.ts';

tester.run('no-else', rule, {
  valid: [
    'function f(a) { if (a) return 1; return 2; }',
    'const y = a ? 1 : 2;',
  ],
  invalid: [
    {
      code: 'function f(a) { if (a) { return 1; } else { return 2; } }',
      errors: [{ messageId: 'redundantElse' }],
    },
    {
      code: 'function f(a) { if (a) { g(); } else { h(); } }',
      errors: [{ messageId: 'restructureElse' }],
    },
    {
      name: 'reports every link of an else-if chain',
      code: 'function f(a, b) { if (a) { g(); } else if (b) { h(); } else { i(); } }',
      errors: 2,
    },
  ],
});
