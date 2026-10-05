import rule from '../src/rules/frontend-module-namespace-import.ts';
import { tsTester as tester } from './tester.ts';

tester.run('frontend-module-namespace-import', rule, {
  valid: [
    "import * as Forms from '#modules/forms';",
    "import * as CommonUI from '#modules/common-ui';",
    "import type * as Locations from '#modules/locations';",
    "import * as FormDrafts from '#modules/form-drafts';",
    "import { Schema } from 'effect';",
    "import '#modules/forms';",
  ],
  invalid: [
    {
      code: "import { useAppForm } from '#modules/forms';",
      errors: [{ messageId: 'notNamespace' }],
    },
    {
      code: "import type { Location } from '#modules/locations';",
      errors: [{ messageId: 'notNamespace' }],
    },
    {
      code: "import Forms from '#modules/forms';",
      errors: [{ messageId: 'notNamespace' }],
    },
    {
      code: "import * as F from '#modules/forms';",
      errors: [{ messageId: 'wrongName' }],
    },
    {
      code: "import * as forms from '#modules/forms';",
      errors: [{ messageId: 'wrongName' }],
    },
    {
      code: "import * as Ui from '#modules/common-ui';",
      errors: [{ messageId: 'wrongName' }],
    },
    {
      code: "export { useAppForm } from '#modules/forms';",
      errors: [{ messageId: 'reExport' }],
    },
    {
      code: "export * from '#modules/forms';",
      errors: [{ messageId: 'reExport' }],
    },
  ],
});
