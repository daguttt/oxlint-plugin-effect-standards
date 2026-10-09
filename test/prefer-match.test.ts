import rule from '../src/rules/prefer-match.ts';
import { moduleTester as tester } from './tester.ts';

tester.run('prefer-match', rule, {
  valid: [
    {
      name: 'a tagged union handled by Match.valueTags',
      code: 'const message = Match.valueTags(error, { NotFound: () => "missing", Denied: () => "denied" });',
    },
    {
      name: 'a value handled by Match.value',
      code: 'const label = Match.value(step).pipe(Match.when(0, () => "first"), Match.orElse(() => "later"));',
    },
    {
      name: 'an identifier named switch-like is not a switch statement',
      code: 'const switchTo = (tab: string) => tabs[tab]; switchTo("home");',
    },
  ],
  invalid: [
    {
      name: 'a switch on _tag',
      code: 'function f(error: E) { switch (error._tag) { case "NotFound": return "missing"; case "Denied": return "denied"; } }',
      errors: [{ messageId: 'tagSwitch' }],
    },
    {
      name: 'a switch on a quoted _tag key',
      code: 'function f(error: E) { switch (error["_tag"]) { case "NotFound": return 1; case "Denied": return 0; } }',
      errors: [{ messageId: 'tagSwitch' }],
    },
    {
      name: 'wrappers around the discriminant and its quoted key do not hide _tag',
      code: 'function f(error: E) { switch ((error!["_tag" as const] as string)) { case "NotFound": return 1; } }',
      errors: [{ messageId: 'tagSwitch' }],
    },
    {
      name: 'a default case is a fallback Match.valueTags cannot express',
      code: 'function f(error: E) { switch (error._tag) { case "NotFound": return 1; default: return 0; } }',
      errors: [{ messageId: 'partialTagSwitch' }],
    },
    {
      name: 'an optional _tag may be absent, so it keeps a fallback',
      code: 'function f(result: R) { switch (result.failure?._tag) { case "NotFound": return 1; case "Denied": return 0; } }',
      errors: [{ messageId: 'partialTagSwitch' }],
    },
    {
      name: 'a non-null assertion inside or outside the chain reads the same',
      code: 'function f(a: A, b: A) { switch (a?._tag!) { case "X": return 1; } switch ((b?._tag)!) { case "X": return 1; } }',
      errors: [
        { messageId: 'partialTagSwitch' },
        { messageId: 'partialTagSwitch' },
      ],
    },
    {
      name: 'a switch on a plain value',
      code: 'function f(step: number) { switch (step) { case 0: return "first"; default: return "later"; } }',
      errors: [{ messageId: 'valueSwitch' }],
    },
    {
      name: 'a computed key that only happens to be named _tag reads another property',
      code: 'function f(error: E, _tag: string) { switch (error[_tag]) { default: return 0; } }',
      errors: [{ messageId: 'valueSwitch' }],
    },
    {
      name: 'switch (true) is a value switch',
      code: 'function f(n: number) { switch (true) { case n > 1: return "many"; default: return "few"; } }',
      errors: [{ messageId: 'valueSwitch' }],
    },
    {
      name: 'nested switches are each reported',
      code: 'function f(a: A, n: number) { switch (a._tag) { case "X": switch (n) { default: return 1; } case "Y": return 0; } }',
      errors: [{ messageId: 'tagSwitch' }, { messageId: 'valueSwitch' }],
    },
  ],
});
