import path from 'node:path';
import { fileURLToPath } from 'node:url';

import rule from '../src/rules/route-feat-public-api.ts';
import { tsxTester as tester } from './tester.ts';

const routes = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/apps/frontend/src/routes'
);
const route = (relative: string) => path.join(routes, relative);

tester.run('route-feat-public-api', rule, {
  valid: [
    {
      name: 'the barrel spelled with a .js extension',
      filename: route('orgs/$subdomain/customers/index.tsx'),
      code: `import * as CustomersRouteFeat from './-feat/index.js';`,
    },
    {
      name: 'a sibling subtree importing through the barrel',
      filename: route('orgs/$subdomain/pets/new/-feat/owner-picker.tsx'),
      code: `import * as CustomersRouteFeat from '#routes/orgs/$subdomain/customers/-feat';`,
    },
    {
      name: 'own -feat through the barrel',
      filename: route('orgs/$subdomain/customers/index.tsx'),
      code: `import * as CustomersRouteFeat from './-feat';`,
    },
    {
      name: 'nested route through the parent barrel',
      filename: route('orgs/$subdomain/customers/$customerId/-feat/panel.tsx'),
      code: `import * as CustomersRouteFeat from '#routes/orgs/$subdomain/customers/-feat';`,
    },
    {
      name: 'files inside a -feat import each other directly',
      filename: route('orgs/$subdomain/customers/-feat/customers-table.tsx'),
      code: `import { format } from './customer-formatting'; import { x } from '#routes/orgs/$subdomain/customers/-feat/helper';`,
    },
    {
      name: 'barrel re-exports its own files',
      filename: route('orgs/$subdomain/customers/-feat/index.ts'),
      code: `export { helper } from './helper';`,
    },
  ],
  invalid: [
    {
      filename: route('orgs/$subdomain/customers/$customerId/index.tsx'),
      code: `import { helper } from '#routes/orgs/$subdomain/customers/-feat/helper';`,
      errors: [{ messageId: 'deepImport' }],
    },
    {
      filename: route('orgs/$subdomain/customers/index.tsx'),
      code: `import { helper } from './-feat/helper'; export { other } from './-feat/other';`,
      errors: [{ messageId: 'deepImport' }, { messageId: 'deepImport' }],
    },
    {
      filename: route('orgs/$subdomain/customers/index.tsx'),
      code: `const lazy = () => import('./-feat/helper');`,
      errors: [{ messageId: 'deepImport' }],
    },
  ],
});
