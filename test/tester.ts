import { describe, it } from 'node:test';

import { RuleTester } from 'oxlint/plugins-dev';

RuleTester.describe = describe;
RuleTester.it = it;

export const tsTester = new RuleTester({
  languageOptions: { parserOptions: { lang: 'ts' } },
});

export const moduleTester = new RuleTester({
  languageOptions: { sourceType: 'module', parserOptions: { lang: 'ts' } },
});

export const tsxTester = new RuleTester({
  languageOptions: { parserOptions: { lang: 'tsx' } },
});
