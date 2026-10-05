import rule from '../src/rules/table-adapter.ts';
import { moduleTester as tester } from './tester.ts';

const filename = '/repo/packages/backend/src/confect/tables/customers.ts';

tester.run('table-adapter', rule, {
  valid: [
    {
      filename,
      code: `export default Table.make(() => CustomersDomain.CustomersTableSchema);`,
    },
    {
      filename,
      code: `export default Table.make(() => CustomersDomain.CustomersTableSchema)
       .index('by_organizationId', ['organizationId'])
       .searchIndex('by_searchTerms', { searchField: 'searchTerms' });`,
    },
    {
      name: 'a file outside confect/tables is not a table file',
      filename:
        '/repo/packages/backend/src/confect/modules/customers/domain/models.ts',
      code: `export const customers = Table.make(() => Schema.Struct({}));`,
    },
  ],
  invalid: [
    {
      filename,
      code: `export default Table.make(() => Schema.Struct({ name: Schema.String })).index('by_name', ['name']);`,
      errors: [{ messageId: 'notAdapter' }],
    },
    {
      filename,
      code: `export default Table.make(() => CustomersDomain.CustomerListItem);`,
      errors: [{ messageId: 'notAdapter' }],
    },
    {
      filename,
      code: `export const customers = Table.make(() => CustomersDomain.CustomersTableSchema);`,
      errors: [{ messageId: 'missingDefault' }],
    },
  ],
});
