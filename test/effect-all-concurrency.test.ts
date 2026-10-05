import rule from '../src/rules/effect-all-concurrency.ts';
import { moduleTester as tester } from './tester.ts';

tester.run('effect-all-concurrency', rule, {
  valid: [
    // Constants that name each other cannot be read, so the spread is trusted.
    `const first = second; const second = first; Effect.all([a, b], { ...first });`,
    `const options = { 'concurrency': 2 }; Effect.all([a, b], { ...options });`,
    `const defaults = { concurrency: 2 }; const options = { ...defaults }; Effect.all([a, b], { ...options });`,
    `const options = { concurrency: 2 }; Effect.all([a, b], { ...options });`,
    // An unreadable spread is trusted.
    `const run = (options) => Effect.all([a, b], { ...options });`,
    // A destructured binding is not read, so the call is left alone.
    `const { options } = { options: { concurrency: 1 } }; Effect.all([a, b], options);`,
    `const options = { concurrency: 'unbounded' }; Effect.all([a, b], options);`,
    // A parameter cannot be read, so the call is left alone.
    `const run = (effects) => Effect.all(effects);`,
    `Effect.all([a, b], { concurrency: 'unbounded' });`,
    `Effect.all({ a, b }, { concurrency: 1 });`,
    `Effect.all([a, b], { ['concurrency']: 1 });`,
    `Effect.all([a, b], { 'concurrency': 1 });`,
    `Effect.all([a, b], { discard: true, concurrency: 4 });`,
    // A single effect has nothing to run concurrently.
    `Effect.all([a]);`,
    // A non-literal collection or options object is out of syntactic reach.
    `Effect.all(effects);`,
    `Effect.all([a, b], options);`,
    `Effect.all([a, b], { ...options });`,
    `Other.all([a, b]);`,
  ],
  invalid: [
    {
      name: 'a constant that names another constant',
      code: `const defaults = { discard: true }; const options = defaults; Effect.all([a, b], { ...options });`,
      errors: [{ messageId: 'missingConcurrency' }],
    },
    {
      name: 'nested spread constants that omit concurrency',
      code: `const defaults = { discard: true }; const options = { ...defaults }; Effect.all([a, b], { ...options });`,
      errors: [{ messageId: 'missingConcurrency' }],
    },
    {
      name: 'a spread constant that omits concurrency',
      code: `const options = { discard: true }; Effect.all([a, b], { ...options });`,
      errors: [{ messageId: 'missingConcurrency' }],
    },
    {
      name: 'collection held in a constant',
      code: `const effects = [a, b]; Effect.all(effects);`,
      errors: [{ messageId: 'missingConcurrency' }],
    },
    {
      name: 'options held in a constant that omits concurrency',
      code: `const options = { discard: true }; Effect.all([a, b], options);`,
      errors: [{ messageId: 'missingConcurrency' }],
    },
    {
      name: 'options behind satisfies',
      code: `Effect.all([a, b], {} satisfies Options);`,
      errors: [{ messageId: 'missingConcurrency' }],
    },
    {
      name: 'collection behind a type assertion',
      code: `Effect.all([a, b] as const);`,
      errors: [{ messageId: 'missingConcurrency' }],
    },
    {
      code: `Effect.all([a, b]);`,
      errors: [{ messageId: 'missingConcurrency' }],
    },
    {
      code: `Effect.all({ a, b });`,
      errors: [{ messageId: 'missingConcurrency' }],
    },
    {
      code: `Effect.all([a, b], { discard: true });`,
      errors: [{ messageId: 'missingConcurrency' }],
    },
    {
      code: `Effect.all([...effects]);`,
      errors: [{ messageId: 'missingConcurrency' }],
    },
  ],
});
