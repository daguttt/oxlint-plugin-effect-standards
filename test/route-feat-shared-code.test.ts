import path from 'node:path';
import { fileURLToPath } from 'node:url';

import rule from '../src/rules/route-feat-shared-code.ts';
import { tsxTester as tester } from './tester.ts';

const source = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/apps/frontend/src'
);
const route = (relative: string) => path.join(source, 'routes', relative);

// The fixture tree under `shelter/` decides who else uses each export of `shelter/-feat`:
//   owned       shelter itself, kennels
//   parked      kennels, rooms
//   single      kennels; rooms only mentions it in a comment, strings, a regex, JSX text,
//               a test, and as the name of a variable used as a computed key
//   nestedOnly  kennels, kennels/$kennelId
//   grandchild  kennels/$kennelId, kennels/new
//   internal    kennels, rooms, and `shelter/-feat/page.tsx` by a direct import
//   Panel       rooms (as a JSX tag)
//   Shared      rooms (as a type)
//   TypeOnly    kennels, rooms/-feat (through `import type * as`, double-quoted)
//   flatOwned   kennels, rooms, and the flat owner file `shelter.tsx`
//   flatShared  kennels, and the flat sibling file `shelter.yard.tsx`
//   destructured, optional (`?.`), escaped (`['esc\u0061ped']`), wrapped (`(F).wrapped`),
//   computedKey (`{ ['computedKey']: … }`), assigned (`({ assigned } = F)`)  rooms
//   lazyOwned   kennels, rooms, and the owner's lazy file `shelter.lazy.tsx`
//   componentOwned  kennels, rooms, and the owner's split file `shelter.component.tsx`
//   dottedShared  the dotted folder route `shelter.$animalId/route.tsx`
// `routes/-feat` belongs to the root route: `__root.tsx`, kennels and rooms use `rootOwned`.
// `shelter/-helpers/-feat` also belongs to `shelter`; rooms uses its `helper`.
const shelterFeat = `import * as ShelterRouteFeat from '#routes/orgs/$subdomain/shelter/-feat';`;
const kennels = route('orgs/$subdomain/shelter/kennels/index.tsx');

tester.run('route-feat-shared-code', rule, {
  valid: [
    {
      name: 'the owner route uses its own -feat',
      filename: route('orgs/$subdomain/shelter/index.tsx'),
      code: `import * as ShelterRouteFeat from './-feat'; ShelterRouteFeat.parked;`,
    },
    {
      name: 'a flat route file is the route its folder names',
      filename: route('orgs/$subdomain/shelter.tsx'),
      code: `import * as ShelterRouteFeat from './shelter/-feat'; ShelterRouteFeat.parked;`,
    },
    {
      name: 'a -feat inside a private folder belongs to the route holding it',
      filename: route('orgs/$subdomain/shelter/index.tsx'),
      code: `import * as HelpersRouteFeat from './-helpers/-feat'; HelpersRouteFeat.helper;`,
    },
    {
      name: 'a file named -feat.ts is not a -feat directory',
      filename: route('orgs/$subdomain/shelter/index.tsx'),
      code: `import * as YardRouteFeat from './yard/-feat'; YardRouteFeat.notABarrel;`,
    },
    {
      name: 'a flat owner route file uses the export',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat.flatOwned;`,
    },
    {
      name: 'the owner route’s lazy file uses the export',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat.lazyOwned;`,
    },
    {
      name: 'the owner route’s split component file uses the export',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat.componentOwned;`,
    },
    {
      name: 'a reserved word in the middle of a flat file name is a path segment',
      filename: route('orgs/$subdomain/shelter.route.edit.tsx'),
      code: `import * as RouteRouteFeat from '#routes/orgs/$subdomain/shelter/route/-feat'; RouteRouteFeat.routeHelper;`,
    },
    {
      name: 'a dotted folder is a route nested under the owner',
      filename: route('orgs/$subdomain/shelter.$animalId/route.tsx'),
      code: `${shelterFeat} ShelterRouteFeat.owned;`,
    },
    {
      name: '__root.tsx is the root route, and uses the export',
      filename: kennels,
      code: `import * as RootRouteFeat from '#routes/-feat'; RootRouteFeat.rootOwned;`,
    },
    {
      name: 'a key computed at run time names no export',
      filename: kennels,
      code: `${shelterFeat} const parked = 'owned' as string; ShelterRouteFeat[\`\${parked}\`];`,
    },
    {
      name: 'a nested route uses what the owner route also uses',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat.owned;`,
    },
    {
      name: 'the owner uses an export through a file inside its -feat',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat.internal;`,
    },
    {
      name: 'one route alone uses an export; comments, strings and tests elsewhere do not count',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat.single;`,
    },
    {
      name: 'a route and a route nested under it share an export',
      filename: route('orgs/$subdomain/shelter/kennels/$kennelId/index.tsx'),
      code: `${shelterFeat} ShelterRouteFeat.nestedOnly;`,
    },
    {
      name: 'a local binding shadows the namespace',
      filename: kennels,
      code: `${shelterFeat} const read = (ShelterRouteFeat: { parked: number }) => ShelterRouteFeat.parked;`,
    },
    {
      name: 'a computed property is not the export of the same name',
      filename: kennels,
      code: `${shelterFeat} const parked = 'owned' as const; ShelterRouteFeat[parked];`,
    },
    {
      name: 'test files are not checked',
      filename: route('orgs/$subdomain/customers/customers.test.tsx'),
      code: shelterFeat,
    },
    {
      name: 'a route import is not a -feat import',
      filename: route('orgs/$subdomain/pets/index.tsx'),
      code: `import * as CustomersRoute from '#routes/orgs/$subdomain/customers/index';`,
    },
  ],
  invalid: [
    {
      name: 'a sibling route imports another route’s -feat',
      filename: route('orgs/$subdomain/pets/new/-feat/owner-picker.tsx'),
      code: `import * as CustomersRouteFeat from '#routes/orgs/$subdomain/customers/-feat';`,
      errors: [{ messageId: 'outsideRoute' }],
    },
    {
      name: 'a parent route imports a nested route’s -feat',
      filename: route('orgs/$subdomain/shelter/index.tsx'),
      code: `import * as KennelsRouteFeat from './kennels/-feat';`,
      errors: [{ messageId: 'outsideRoute' }],
    },
    {
      name: 'a module imports a route’s -feat',
      filename: path.join(source, 'modules/pets/pet-card.components.tsx'),
      code: shelterFeat,
      errors: [{ messageId: 'outsideRoute' }],
    },
    {
      name: 'an export two child routes share, reported once',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat.parked; ShelterRouteFeat.parked;`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'a flat route file shares an export with a sibling route',
      filename: route('orgs/$subdomain/shelter.kennels.tsx'),
      code: `import * as ShelterRouteFeat from './shelter/-feat'; ShelterRouteFeat.parked;`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'two routes inside the same child share an export',
      filename: route('orgs/$subdomain/shelter/kennels/new/index.tsx'),
      code: `${shelterFeat} ShelterRouteFeat.grandchild;`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'a flat sibling route file shares the export',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat.flatShared;`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'a -feat inside a private folder, shared by two child routes',
      filename: kennels,
      code: `import * as HelpersRouteFeat from '#routes/orgs/$subdomain/shelter/-helpers/-feat'; HelpersRouteFeat.helper;`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'destructured from the namespace',
      filename: kennels,
      code: `${shelterFeat} const { parked, 'owned': mine } = ShelterRouteFeat;`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'the other route destructures it',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat.destructured;`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'the other route reads it through optional chaining',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat?.optional;`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'the other route reads it through an escaped quoted property',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat.escaped;`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'the other route reads it through parentheses, a computed binding key, or an assignment',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat.wrapped; ShelterRouteFeat.computedKey; ShelterRouteFeat.assigned;`,
      errors: [
        { messageId: 'parkedInAncestor' },
        { messageId: 'parkedInAncestor' },
        { messageId: 'parkedInAncestor' },
      ],
    },
    {
      name: 'a template key, a wrapped namespace, and a destructuring assignment',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat[\`parked\`]; ShelterRouteFeat!.Panel; let Shared; ({ Shared } = (ShelterRouteFeat as any));`,
      errors: [
        { messageId: 'parkedInAncestor' },
        { messageId: 'parkedInAncestor' },
        { messageId: 'parkedInAncestor' },
      ],
    },
    {
      name: 'a module in a nested src folder imports a route’s -feat',
      filename: path.join(source, 'modules/src/pets.tsx'),
      code: shelterFeat,
      errors: [{ messageId: 'outsideRoute' }],
    },
    {
      name: 'a dotted folder route shares the export',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat.dottedShared;`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'a component used as a JSX tag',
      filename: kennels,
      code: `${shelterFeat} const panel = <ShelterRouteFeat.Panel />;`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'a type used through the namespace',
      filename: kennels,
      code: `${shelterFeat} let value: ShelterRouteFeat.Shared;`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'a type the other route reads through `import type * as`',
      filename: kennels,
      code: `import type * as ShelterRouteFeat from "#routes/orgs/$subdomain/shelter/-feat"; let count: ShelterRouteFeat.TypeOnly;`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'a quoted property',
      filename: kennels,
      code: `${shelterFeat} ShelterRouteFeat['parked'];`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
    {
      name: 'a use written before the import',
      filename: kennels,
      code: `ShelterRouteFeat.parked; ${shelterFeat}`,
      errors: [{ messageId: 'parkedInAncestor' }],
    },
  ],
});
