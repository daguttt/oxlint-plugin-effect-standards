import path from 'node:path';
import { fileURLToPath } from 'node:url';

import rule from '../src/rules/frontend-route-namespace-import.ts';
import { tsTester as tester } from './tester.ts';

const ROUTES = path.join('/repo/apps/frontend/src/routes/orgs/$subdomain');
// Real files: an asset is told from a route by whether it exists as written.
const FIXTURE_ROUTE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/apps/frontend/src/routes/orgs/$subdomain/customers/index.tsx'
);
const ROUTE_FILE = path.join(ROUTES, 'pets/$petId/index.tsx');
const FEAT_FILE = path.join(ROUTES, 'customers/-feat/customers-table.tsx');
const MODULE_FILE = '/repo/apps/frontend/src/modules/pets/pet-card.tsx';
const FEAT = '#routes/orgs/$subdomain/customers/-feat';

tester.run('frontend-route-namespace-import', rule, {
  valid: [
    {
      name: 'an asset next to a route is not a route',
      code: "import logoUrl from './logo.svg';",
      filename: FIXTURE_ROUTE,
    },
    {
      name: 'an asset with a bundler query',
      code: "import logoUrl from './missing.svg?url';",
      filename: ROUTE_FILE,
    },
    {
      name: 'assets of other types',
      code: "import policyUrl from './policy.pdf'; import manifestUrl from './site.webmanifest';",
      filename: FIXTURE_ROUTE,
    },
    {
      name: 'exporting something local alongside a feature import',
      code: `import * as CustomersRouteFeat from '${FEAT}'; const rows = CustomersRouteFeat.rows; export { rows };`,
      filename: ROUTE_FILE,
    },
    {
      code: `import * as CustomersRouteFeat from '${FEAT}';`,
      filename: ROUTE_FILE,
    },
    {
      name: 'the barrel named explicitly',
      code: `import * as CustomersRouteFeat from '${FEAT}/index.ts';`,
      filename: ROUTE_FILE,
    },
    {
      name: 'the barrel through a relative path with a .js extension',
      code: "import * as PetDetailRouteFeat from './-feat/index.js';",
      filename: ROUTE_FILE,
    },
    {
      code: "import * as CustomersRoute from '#routes/orgs/$subdomain/customers';",
      filename: MODULE_FILE,
    },
    {
      name: 'a relative route import',
      code: "import * as AuthPublicRoute from './route';",
      filename: path.join(ROUTES, '_auth-public/index.tsx'),
    },
    {
      name: "a feature's own file, by relative path",
      code: "import { formatCustomerPhone } from './customer-formatting';",
      filename: FEAT_FILE,
    },
    {
      name: "a feature's own file, through the alias",
      code: `import { formatCustomerPhone } from '${FEAT}/customer-formatting';`,
      filename: FEAT_FILE,
    },
    {
      name: 'a file inside another feature is left to route-feat-public-api',
      code: `import { formatCustomerPhone } from '${FEAT}/customer-formatting';`,
      filename: ROUTE_FILE,
    },
    {
      name: 'a dash-prefixed helper next to a route is not a route',
      code: "import { helper } from './-helpers/format';",
      filename: ROUTE_FILE,
    },
    {
      name: 'an import that resolves outside the routes tree',
      code: "import * as Forms from '#modules/forms';",
      filename: ROUTE_FILE,
    },
  ],
  invalid: [
    {
      name: 'a dot-delimited route name is a route, not an asset',
      code: "import { Route } from './customers.edit';",
      filename: path.join(ROUTES, 'customers.tsx'),
      errors: [{ messageId: 'notNamespace' }],
    },
    {
      name: 'a lazy route file is still a route',
      code: "import { Route } from './index.lazy';",
      filename: path.join(ROUTES, 'customers/index.tsx'),
      errors: [{ messageId: 'notNamespace' }],
    },
    {
      name: 'default-exporting an imported feature namespace',
      code: `import * as CustomersRouteFeat from '${FEAT}'; export default CustomersRouteFeat;`,
      filename: ROUTE_FILE,
      errors: [{ messageId: 'reExport' }],
    },
    {
      name: 're-exporting an imported feature namespace',
      code: `import * as CustomersRouteFeat from '${FEAT}'; export { CustomersRouteFeat };`,
      filename: ROUTE_FILE,
      errors: [{ messageId: 'reExport' }],
    },
    {
      code: `import { CountrySelect } from '${FEAT}';`,
      filename: ROUTE_FILE,
      errors: [{ messageId: 'notNamespace' }],
    },
    {
      code: "import * as Feat from './-feat';",
      filename: ROUTE_FILE,
      errors: [{ messageId: 'wrongSuffix' }],
    },
    {
      code: `import * as CustomersRoute from '${FEAT}';`,
      filename: ROUTE_FILE,
      errors: [{ messageId: 'wrongSuffix' }],
    },
    {
      code: "import * as Customers from '#routes/orgs/$subdomain/customers';",
      filename: MODULE_FILE,
      errors: [{ messageId: 'wrongSuffix' }],
    },
    {
      code: "import * as CustomersRouteFeat from '#routes/orgs/$subdomain/customers';",
      filename: MODULE_FILE,
      errors: [{ messageId: 'wrongSuffix' }],
    },
    {
      name: 'a named import of a relative route',
      code: "import { Route } from './route';",
      filename: path.join(ROUTES, '_auth-public/index.tsx'),
      errors: [{ messageId: 'notNamespace' }],
    },
    {
      name: 'a named import through a relative barrel with a .js extension',
      code: "import { CustomersTable } from './-feat/index.js';",
      filename: path.join(ROUTES, 'customers/index.tsx'),
      errors: [{ messageId: 'notNamespace' }],
    },
    {
      code: `export type { PetId } from '${FEAT}';`,
      filename: ROUTE_FILE,
      errors: [{ messageId: 'reExport' }],
    },
    {
      code: `export * from '${FEAT}';`,
      filename: ROUTE_FILE,
      errors: [{ messageId: 'reExport' }],
    },
    {
      name: 're-exporting a relative route',
      code: "export { Route } from './route';",
      filename: path.join(ROUTES, '_auth-public/index.tsx'),
      errors: [{ messageId: 'reExport' }],
    },
  ],
});
