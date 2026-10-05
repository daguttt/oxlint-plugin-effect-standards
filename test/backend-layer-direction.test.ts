import rule from '../src/rules/backend-layer-direction.ts';
import { tsTester as tester } from './tester.ts';

const MODULES = '/repo/packages/backend/src/confect/modules';

tester.run('backend-layer-direction', rule, {
  valid: [
    {
      name: 'domain imports generated documents as types, extension spelled out',
      code: "import type { PetsDoc } from '../../../_generated/docs.ts';",
      filename: `${MODULES}/pets/domain/fullName.ts`,
    },
    {
      name: 'domain imports another module through its domain layer',
      code: "import * as CommonTextDomain from '../../commonText/domain';",
      filename: `${MODULES}/pets/domain/models.ts`,
    },
    {
      name: 'domain imports the generated id schema',
      code: "import { Id } from '../../../_generated/id';",
      filename: `${MODULES}/pets/domain/models.ts`,
    },
    {
      name: 'domain imports generated documents as types',
      code: "import type { PetsDoc } from '../../../_generated/docs';",
      filename: `${MODULES}/pets/domain/fullName.ts`,
    },
    {
      name: 'application imports its own domain and another module barrel',
      code: "import * as Domain from '../domain'; import * as Addresses from '../../addresses';",
      filename: `${MODULES}/customers/application/projections.ts`,
    },
    {
      name: 'application imports generated services',
      code: "import { DatabaseWriter } from '../../../_generated/services';",
      filename: `${MODULES}/customers/application/mutations.ts`,
    },
    {
      name: 'infrastructure imports application and domain',
      code: "import * as Application from '../application'; import * as Domain from '../domain';",
      filename: `${MODULES}/workos/infrastructure/live.ts`,
    },
    {
      name: 'presentation imports domain',
      code: "import * as Domain from '../domain';",
      filename: `${MODULES}/pets/presentation/errors.ts`,
    },
    {
      name: 'files outside a module layer are not checked',
      code: "import * as Infrastructure from './modules/pets/infrastructure';",
      filename: '/repo/packages/backend/src/confect/pets.impl.ts',
    },
  ],
  invalid: [
    {
      name: 'domain imports its own module barrel spelled with a .js extension',
      code: "import * as Pets from '../index.js';",
      filename: `${MODULES}/pets/domain/models.ts`,
      errors: [{ messageId: 'domainBarrel' }],
    },
    {
      name: 'domain imports its own module barrel',
      code: "import * as Pets from '..';",
      filename: `${MODULES}/pets/domain/models.ts`,
      errors: [{ messageId: 'domainBarrel' }],
    },
    {
      name: 'domain imports application',
      code: "import * as Application from '../application';",
      filename: `${MODULES}/pets/domain/models.ts`,
      errors: [{ messageId: 'forbiddenLayer' }],
    },
    {
      name: 'domain imports a file inside another module infrastructure',
      code: "import { client } from '../../workos/infrastructure/client';",
      filename: `${MODULES}/pets/domain/models.ts`,
      errors: [{ messageId: 'forbiddenLayer' }],
    },
    {
      name: 'domain imports another module barrel',
      code: "import * as Addresses from '../../addresses';",
      filename: `${MODULES}/customers/domain/models.ts`,
      errors: [{ messageId: 'domainBarrel' }],
    },
    {
      name: 'domain imports the Convex data model',
      code: "import type { Id } from '#convex/_generated/dataModel';",
      filename: `${MODULES}/locations/domain/currentLocation.ts`,
      errors: [{ messageId: 'domainGenerated' }],
    },
    {
      name: 'domain imports generated documents as values',
      code: "import { PetsDoc } from '../../../_generated/docs';",
      filename: `${MODULES}/pets/domain/fullName.ts`,
      errors: [{ messageId: 'domainGeneratedDocs' }],
    },
    {
      name: 'application imports infrastructure',
      code: "import * as Infrastructure from '../infrastructure';",
      filename: `${MODULES}/pets/application/mutations.ts`,
      errors: [{ messageId: 'forbiddenLayer' }],
    },
    {
      name: 'application re-exports presentation',
      code: "export * from '../presentation';",
      filename: `${MODULES}/pets/application/index.ts`,
      errors: [{ messageId: 'forbiddenLayer' }],
    },
    {
      name: 'presentation imports application',
      code: "import type * as Application from '../application';",
      filename: `${MODULES}/pets/presentation/errors.ts`,
      errors: [{ messageId: 'forbiddenLayer' }],
    },
    {
      name: 'infrastructure imports presentation',
      code: "import * as Presentation from '../presentation';",
      filename: `${MODULES}/pets/infrastructure/live.ts`,
      errors: [{ messageId: 'forbiddenLayer' }],
    },
  ],
});
