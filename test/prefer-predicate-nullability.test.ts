import rule from '../src/rules/prefer-predicate-nullability.ts';
import { moduleTester as tester } from './tester.ts';

const IMPORT = "import * as Predicate from 'effect/Predicate';";

tester.run('prefer-predicate-nullability', rule, {
  valid: [
    `${IMPORT}\nif (Predicate.isNull(x)) {}`,
    'if (x) {}',
    'const y = x ?? 1;',
    'const y = x?.y;',
    "if (typeof window === 'undefined') {}",
    // An ambient declaration does not make the global exist at runtime.
    "declare const optionalGlobal: unknown; if (typeof optionalGlobal === 'undefined') {}",
    "declare function optionalGlobal(): void; if (typeof optionalGlobal === 'undefined') {}",
    "declare class OptionalGlobal {} if (typeof OptionalGlobal === 'undefined') {}",
    "declare const optionalGlobal: unknown; if (typeof (optionalGlobal as unknown) === 'undefined') {}",
    "import type { OptionalGlobal } from './globals'; if (typeof OptionalGlobal === 'undefined') {}",
    "import { type OptionalGlobal } from './globals'; if (typeof OptionalGlobal === 'undefined') {}",
    "type optionalGlobal = string; declare const optionalGlobal: unknown; if (typeof optionalGlobal === 'undefined') {}",
    "declare global { const optionalGlobal: unknown } if (typeof optionalGlobal === 'undefined') {}",
    "if (typeof x === 'string') {}",
    'if (x === 0) {}',
    'const y: string | null = null;',
    // A local binding named `undefined` is not the global sentinel.
    'function f(undefined, x) { return x === undefined; }',
    'const undefined = 1; const y = x !== undefined;',
  ],
  invalid: [
    {
      name: 'another Effect export aliased to Predicate is not called',
      code: "import { Option as Predicate } from 'effect';\nconst y = x === null;",
      output: null,
      errors: 1,
    },
    {
      name: 'the Effect barrel namespace is not called',
      code: "import * as Predicate from 'effect';\nconst y = x === null;",
      output: null,
      errors: 1,
    },
    {
      name: 'a type-only Predicate import is not called',
      code: "import type * as Predicate from 'effect/Predicate';\nconst y = x === null;",
      output: null,
      errors: 1,
    },
    {
      name: 'a sequence operand keeps its parentheses',
      code: `${IMPORT}\nconst y = (a, b) === null;`,
      output: `${IMPORT}\nconst y = Predicate.isNull((a, b));`,
      errors: 1,
    },
    {
      name: 'a parameter named Predicate is not called',
      code: `${IMPORT}\nfunction f(Predicate, x) { return x === null; }`,
      output: null,
      errors: 1,
    },
    {
      name: 'a local Predicate that is not an import is not called or redeclared',
      code: 'const Predicate = {};\nconst y = x === null;',
      output: null,
      errors: 1,
    },
    {
      name: 'a Predicate imported from elsewhere is not called',
      code: "import { Predicate } from './predicate';\nconst y = x === null;",
      output: null,
      errors: 1,
    },
    {
      name: 'the import rides on the first fixable comparison',
      code: 'const y = x /* keep */ === null;\nconst z = w === undefined;',
      output:
        "import * as Predicate from 'effect/Predicate';\nconst y = x /* keep */ === null;\nconst z = Predicate.isUndefined(w);",
      errors: 2,
    },
    {
      name: 'the import goes below a hashbang',
      code: '#!/usr/bin/env node\nconst y = x === null;',
      output:
        "#!/usr/bin/env node\nimport * as Predicate from 'effect/Predicate';\nconst y = Predicate.isNull(x);",
      errors: 1,
    },
    {
      name: 'strict null, import already present',
      code: `${IMPORT}\nif (x === null) {}`,
      output: `${IMPORT}\nif (Predicate.isNull(x)) {}`,
      errors: 1,
    },
    {
      name: 'barrel import counts as an existing binding',
      code: "import { Effect, Predicate } from 'effect';\nconst y = a.b !== undefined;",
      output:
        "import { Effect, Predicate } from 'effect';\nconst y = Predicate.isNotUndefined(a.b);",
      errors: 1,
    },
    {
      name: 'adds the import once, after the last import',
      code: "import { a, b } from './x';\nconst y = a === null || b !== null;",
      output: `import { a, b } from './x';\n${IMPORT}\nconst y = Predicate.isNull(a) || Predicate.isNotNull(b);`,
      errors: 2,
    },
    {
      name: 'adds the import to a file with none, after directives',
      code: "'use node';\nconst y = x === undefined;",
      output: `'use node';\n${IMPORT}\nconst y = Predicate.isUndefined(x);`,
      errors: 1,
    },
    {
      name: 'yoda and loose equality',
      code: `${IMPORT}\nconst y = [null !== x, x == null, x != undefined];`,
      output: `${IMPORT}\nconst y = [Predicate.isNotNull(x), Predicate.isNullish(x), Predicate.isNotNullish(x)];`,
      errors: 3,
    },
    {
      name: 'typeof on a declared binding',
      code: `${IMPORT}\nconst f = (x?: string) => typeof x === 'undefined';`,
      output: `${IMPORT}\nconst f = (x?: string) => Predicate.isUndefined(x);`,
      errors: 1,
    },
    {
      name: 'keeps operands that needed parentheses intact',
      code: `${IMPORT}\nconst y = !((a ?? b) === null);`,
      output: `${IMPORT}\nconst y = !(Predicate.isNull(a ?? b));`,
      errors: 1,
    },
    {
      name: 'reports but does not fix when a comment would be lost',
      code: `${IMPORT}\nconst y = x /* why */ === null;`,
      output: null,
      errors: 1,
    },
  ],
});
