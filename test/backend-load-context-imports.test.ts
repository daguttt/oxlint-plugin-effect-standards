import rule from '../src/rules/backend-load-context-imports.ts';
import { tsTester as tester } from './tester.ts';

const CONFECT = '/repo/packages/backend/src/confect';

tester.run('backend-load-context-imports', rule, {
  valid: [
    {
      name: 'a table imports the domain entry spelled with a .js extension',
      code: "import * as CustomersDomain from '../modules/customers/domain/index.js';",
      filename: `${CONFECT}/tables/customers.ts`,
    },
    {
      name: 'a table imports a module through its domain layer',
      code: "import * as CustomersDomain from '../modules/customers/domain';",
      filename: `${CONFECT}/tables/customers.ts`,
    },
    {
      name: 'a spec imports domain layers, the generated id schema and another spec',
      code: "import * as CustomersDomain from './modules/customers/domain'; import { Id } from './_generated/id'; import RequirePermission from './middleware/RequirePermission.spec';",
      filename: `${CONFECT}/customers.spec.ts`,
    },
    {
      name: 'an implementation may import the barrel and refs',
      code: "import * as Customers from './modules/customers'; import refs from './_generated/refs';",
      filename: `${CONFECT}/customers.impl.ts`,
    },
    {
      name: 'a module file is not a load-context file',
      code: "import * as Addresses from '../../addresses';",
      filename: `${CONFECT}/modules/customers/application/projections.ts`,
    },
  ],
  invalid: [
    {
      name: 'a spec imports an implementation file spelled with a .js extension',
      code: "import './customers.impl.js';",
      filename: `${CONFECT}/customers.spec.ts`,
      errors: [{ messageId: 'specImpl' }],
    },
    {
      name: 'a spec imports generated refs with the extension spelled out',
      code: "import refs from './_generated/refs.ts';",
      filename: `${CONFECT}/customers.spec.ts`,
      errors: [{ messageId: 'specRefs' }],
    },
    {
      name: 'a table imports a module barrel',
      code: "import * as Customers from '../modules/customers';",
      filename: `${CONFECT}/tables/customers.ts`,
      errors: [{ messageId: 'moduleEntry' }],
    },
    {
      name: 'a table imports a file inside the domain layer',
      code: "import { CustomersTableSchema } from '../modules/customers/domain/models';",
      filename: `${CONFECT}/tables/customers.ts`,
      errors: [{ messageId: 'moduleEntry' }],
    },
    {
      name: 'a table imports generated code',
      code: "import { Id } from '../_generated/id';",
      filename: `${CONFECT}/tables/customers.ts`,
      errors: [{ messageId: 'tableGenerated' }],
    },
    {
      name: 'a spec imports a module barrel',
      code: "import * as Customers from './modules/customers';",
      filename: `${CONFECT}/customers.spec.ts`,
      errors: [{ messageId: 'moduleEntry' }],
    },
    {
      name: 'a spec imports the application layer',
      code: "import type * as Application from './modules/customers/application';",
      filename: `${CONFECT}/customers.spec.ts`,
      errors: [{ messageId: 'moduleEntry' }],
    },
    {
      name: 'a spec imports generated refs, even as a type',
      code: "import type refs from './_generated/refs';",
      filename: `${CONFECT}/customers.spec.ts`,
      errors: [{ messageId: 'specRefs' }],
    },
    {
      name: 'a spec imports an implementation file',
      code: "import { helper } from './customers.impl';",
      filename: `${CONFECT}/customers.spec.ts`,
      errors: [{ messageId: 'specImpl' }],
    },
    {
      name: 'a nested spec imports a module barrel',
      code: "import * as Authorization from '../modules/authorization';",
      filename: `${CONFECT}/middleware/RequirePermission.spec.ts`,
      errors: [{ messageId: 'moduleEntry' }],
    },
  ],
});
