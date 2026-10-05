import rule from '../src/rules/no-try-catch.ts';
import { moduleTester as tester } from './tester.ts';

tester.run('no-try-catch', rule, {
  valid: [
    {
      name: 'a yield in an async generator awaits its operand',
      code: 'async function* pages() { try { yield Promise.reject(new Error("failure")); } catch { yield "recovered"; } }',
    },
    {
      name: 'an awaiting try in an async generator is the async case',
      code: 'async function* pages() { try { yield await fetch(url); } catch { yield null; } }',
    },
    'const r = Result.try(() => JSON.parse(s));',
    {
      name: 'async try/catch is out of scope by default',
      code: 'async function f() { try { await g(); } catch { return null; } }',
    },
    {
      name: 'try/finally is out of scope by default',
      code: 'function f() { try { g(); } finally { h(); } }',
    },
    {
      name: 'generators can be left to effecttsgo/try-catch-in-effect-gen',
      code: 'function* f() { try { yield g(); } catch { return null; } }',
      options: [{ checkGenerators: false }],
    },
  ],
  invalid: [
    {
      code: 'function f(s) { try { return JSON.parse(s); } catch { return null; } }',
      errors: [{ messageId: 'syncTryCatch' }],
    },
    {
      name: 'an await inside a nested function does not make the try async',
      code: 'function f() { try { return () => async () => await g(); } catch { return null; } }',
      errors: [{ messageId: 'syncTryCatch' }],
    },
    {
      code: 'async function f() { try { await g(); } catch { return null; } }',
      options: [{ checkAsync: true }],
      errors: [{ messageId: 'asyncTryCatch' }],
    },
    {
      code: 'function f() { try { g(); } finally { h(); } }',
      options: [{ checkFinallyOnly: true }],
      errors: [{ messageId: 'tryFinally' }],
    },
    {
      name: 'a plain generator is checked by default',
      code: 'function* f(s) { try { return JSON.parse(s); } catch { return null; } }',
      errors: [{ messageId: 'generatorTryCatch' }],
    },
  ],
});
