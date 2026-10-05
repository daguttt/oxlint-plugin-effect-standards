import path from 'node:path';
import { fileURLToPath } from 'node:url';

import rule from '../src/rules/route-feat-barrel.ts';
import { tsxTester as tester } from './tester.ts';

const routes = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/apps/frontend/src/routes'
);
const route = (relative: string) => path.join(routes, relative);

tester.run('route-feat-barrel', rule, {
  valid: [
    {
      name: 'a default export among the exports',
      filename: route('orgs/$subdomain/customers/-feat/index.ts'),
      code: `export default function Panel() {} export { helper } from './helper';`,
    },
    {
      filename: route('orgs/$subdomain/customers/-feat/index.ts'),
      code: `export { helper } from './helper'; export type { Helper } from './helper'; export * from './other';`,
    },
    {
      filename: route('orgs/$subdomain/customers/-feat/helper.ts'),
      code: `export const helper = 1;`,
    },
    {
      filename: route('orgs/$subdomain/customers/index.tsx'),
      code: `const a = 1; export { a };`,
    },
  ],
  invalid: [
    {
      name: 'a default export after other code',
      filename: route('orgs/$subdomain/customers/-feat/index.ts'),
      code: `import { CustomersTable } from './customers-table'; export default CustomersTable;`,
      errors: [{ messageId: 'exportNotAtTop' }],
    },
    {
      filename: route('orgs/$subdomain/customers/-feat/index.ts'),
      code: `import { helper } from './helper'; const wrapped = helper; export { wrapped }; export { other } from './other';`,
      errors: [
        { messageId: 'exportNotAtTop' },
        { messageId: 'exportNotAtTop' },
      ],
    },
    {
      filename: route('orgs/$subdomain/pets/-feat/orphan.ts'),
      code: `export const orphan = 1;`,
      errors: [{ messageId: 'missingBarrel' }],
    },
    {
      filename: route('orgs/$subdomain/customers/-feat/index.tsx'),
      code: `export { helper } from './helper';`,
      errors: [{ messageId: 'barrelExtension' }],
    },
  ],
});
