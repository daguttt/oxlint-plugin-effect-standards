import rule from '../src/rules/no-dynamic-import.ts';
import { moduleTester as tester } from './tester.ts';

tester.run('no-dynamic-import', rule, {
  valid: [
    `import refs from './_generated/refs';`,
    `type Module = typeof import('./modules/workos');`,
  ],
  invalid: [
    {
      code: `const load = async () => await import('./_generated/refs');`,
      errors: [{ messageId: 'dynamicImport' }],
    },
  ],
});
