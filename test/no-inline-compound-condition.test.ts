import rule from '../src/rules/no-inline-compound-condition.ts';
import { moduleTester as tester, tsxTester } from './tester.ts';

tester.run('no-inline-compound-condition', rule, {
  valid: [
    'for (let i = 0; i < limit && hasNext; i++) {}',
    'while (hasNext) {}',
    'const isReady = a && b; if (isReady) {}',
    'if (a) {}',
    'if (!a) {}',
    'const y = (a ?? b) ? 1 : 2;',
    'const node = a && b && c;',
    { code: 'if (a && b) {}', options: [{ minOperands: 3 }] },
    { code: 'const y = a && b ? 1 : 2;', options: [{ checkTernary: false }] },
    { code: 'if (isA || !isB) {}', options: [{ ignoreNamedOperands: true }] },
  ],
  invalid: [
    {
      name: 'a while test',
      code: 'while (hasNext && count < limit) {}',
      errors: [{ messageId: 'nameCondition' }],
    },
    {
      name: 'a do…while test',
      code: 'do {} while (hasNext || isRetrying);',
      errors: [{ messageId: 'nameCondition' }],
    },
    { code: 'if (a && b) {}', errors: 1 },
    { code: 'if (!(a || b)) {}', errors: 1 },
    { code: 'const y = a.x === 1 || b ? 1 : 2;', errors: 1 },
    {
      code: 'if (a && (b || c)) {}',
      options: [{ minOperands: 3 }],
      errors: [{ message: /3 operands/ }],
    },
    {
      code: 'if (isA || b.c === 1) {}',
      options: [{ ignoreNamedOperands: true }],
      errors: 1,
    },
  ],
});

tsxTester.run('no-inline-compound-condition in JSX', rule, {
  valid: [
    'const row = <div>{isVisible && <button />}</div>;',
    'const canEdit = isVisible && isOwner; const row = <div>{canEdit && <button />}</div>;',
    // The last operand is a value, not an element: this is not a rendering guard.
    'const label = <div>{a && b && c}</div>;',
  ],
  invalid: [
    {
      name: 'two conditions guarding an element',
      code: 'const row = <div>{isVisible && isOwner && <button />}</div>;',
      errors: [{ messageId: 'nameCondition' }],
    },
    {
      name: 'a parenthesised element',
      code: 'const row = <div>{(isVisible || isOwner) && (<button />)}</div>;',
      errors: [{ messageId: 'nameCondition' }],
    },
    {
      name: 'a guard outside an expression container',
      code: 'const Row = () => isVisible && isOwner && <button />;',
      errors: [{ messageId: 'nameCondition' }],
    },
  ],
});
