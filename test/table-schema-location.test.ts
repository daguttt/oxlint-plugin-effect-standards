import rule from '../src/rules/table-schema-location.ts';
import { moduleTester as tester } from './tester.ts';

tester.run('table-schema-location', rule, {
  valid: [
    {
      name: 're-exporting a schema from the models file',
      code: `export { PetsTableSchema } from './models';`,
      filename: '/repo/src/confect/modules/pets/domain/index.ts',
    },
    {
      code: `export const CustomersTableSchema = Schema.Struct({});`,
      filename: '/repo/src/confect/modules/customers/domain/models.ts',
    },
    {
      code: `export default Table.make(() => CustomersDomain.CustomersTableSchema);`,
      filename: '/repo/src/confect/tables/customers.ts',
    },
    {
      code: `export const CustomerListItem = Schema.Struct({});`,
      filename: '/repo/src/confect/modules/customers/domain/summaries.ts',
    },
  ],
  invalid: [
    {
      name: 'exported under a quoted schema name',
      code: `const fields = Schema.Struct({}); export { fields as "PetsTableSchema" };`,
      filename: '/repo/src/confect/modules/pets/domain/fields.ts',
      errors: [{ messageId: 'schemaOutsideModels' }],
    },
    {
      name: 'exported under a schema name through an alias',
      code: `const fields = Schema.Struct({}); export { fields as PetsTableSchema };`,
      filename: '/repo/src/confect/modules/pets/domain/fields.ts',
      errors: [{ messageId: 'schemaOutsideModels' }],
    },
    {
      name: 'declared first and exported in a separate statement',
      code: `const PetsTableSchema = Schema.Struct({}); export { PetsTableSchema };`,
      filename: '/repo/src/confect/modules/pets/domain/fields.ts',
      errors: [{ messageId: 'schemaOutsideModels' }],
    },
    {
      code: `export const CustomersTableSchema = Schema.Struct({});`,
      filename: '/repo/src/confect/modules/customers/domain/fields.ts',
      errors: [{ messageId: 'schemaOutsideModels' }],
    },
    {
      code: `export const CustomersTableSchema = Schema.Struct({});`,
      filename: '/repo/src/confect/modules/customers/application/models.ts',
      errors: [{ messageId: 'schemaOutsideModels' }],
    },
    {
      code: `const table = Table.make(() => CustomersDomain.CustomersTableSchema);`,
      filename: '/repo/src/confect/customers.impl.ts',
      errors: [{ messageId: 'tableOutsideTables' }],
    },
  ],
});
