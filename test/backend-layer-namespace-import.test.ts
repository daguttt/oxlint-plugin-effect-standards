import rule from '../src/rules/backend-layer-namespace-import.ts';
import { tsTester as tester } from './tester.ts';

const CONFECT = '/repo/packages/backend/src/confect';

tester.run('backend-layer-namespace-import', rule, {
  valid: [
    {
      code: "import * as Customers from './modules/customers';",
      filename: `${CONFECT}/customers.impl.ts`,
    },
    {
      code: "import * as WorkOS from './modules/workos';",
      filename: `${CONFECT}/workosAuth.impl.ts`,
    },
    {
      code: "import * as CustomersDomain from '../modules/customers/domain';",
      filename: `${CONFECT}/tables/customers.ts`,
    },
    {
      code: "import * as Domain from '../domain'; import type * as Application from '../application';",
      filename: `${CONFECT}/modules/pets/presentation/errors.ts`,
    },
    {
      code: "import * as CommonTextDomain from '../../commonText/domain';",
      filename: `${CONFECT}/modules/pets/domain/models.ts`,
    },
    {
      code: "import { PetsTableSchema } from './models';",
      filename: `${CONFECT}/modules/pets/domain/status.ts`,
    },
    {
      code: "import refs from '../../../_generated/refs'; import { Schema } from 'effect';",
      filename: `${CONFECT}/modules/pets/application/queries.ts`,
    },
  ],
  invalid: [
    {
      code: "import { create } from './modules/customers';",
      filename: `${CONFECT}/customers.impl.ts`,
      errors: [{ messageId: 'notNamespace' }],
    },
    {
      code: "import * as CustomersModule from './modules/customers';",
      filename: `${CONFECT}/customers.impl.ts`,
      errors: [{ messageId: 'wrongName' }],
    },
    {
      code: "import type { UpsertAddressDto } from '../domain';",
      filename: `${CONFECT}/modules/addresses/application/mutations.ts`,
      errors: [{ messageId: 'notNamespace' }],
    },
    {
      code: "import * as PetsDomain from '../domain';",
      filename: `${CONFECT}/modules/pets/application/queries.ts`,
      errors: [{ messageId: 'wrongName' }],
    },
    {
      code: "import * as Domain from '../../customers/domain';",
      filename: `${CONFECT}/modules/pets/application/queries.ts`,
      errors: [{ messageId: 'wrongName' }],
    },
    {
      code: "import { CustomersTableSchema } from '../../customers/domain/models';",
      filename: `${CONFECT}/modules/pets/domain/models.ts`,
      errors: [{ messageId: 'notNamespace' }],
    },
    {
      code: "import * as Models from './models';",
      filename: `${CONFECT}/modules/pets/domain/status.ts`,
      errors: [{ messageId: 'sameLayerNamespace' }],
    },
  ],
});
