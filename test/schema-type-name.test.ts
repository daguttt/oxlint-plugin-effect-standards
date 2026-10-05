import rule from '../src/rules/schema-type-name.ts';
import { tsTester as tester } from './tester.ts';

tester.run('schema-type-name', rule, {
  valid: [
    'const PetSummary = Schema.Struct({}); type PetSummary = typeof PetSummary.Type;',
    'const A = Schema.Struct({}); type A = Schema.Schema.Type<typeof A>;',
    // The Schema suffix marks a value consumed as a schema; its type is free.
    'const PetDetailSearchSchema = Schema.Struct({}); type PetDetailSearch = typeof PetDetailSearchSchema.Type;',
    'const EditPetFormSchema = Schema.Struct({}); type EditPetFormValues = Schema.Schema.Type<typeof EditPetFormSchema>;',
    // Not a direct alias of the decoded type.
    'type Encoded = typeof PetSummary.Encoded;',
    'type Keys = keyof typeof PetSummary.Type;',
    'type Other = typeof config.Type.nested;',
  ],
  invalid: [
    {
      code: 'const Pet = Schema.Struct({}); type PetType = typeof Pet.Type;',
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: 'const PetModel = Schema.Struct({}); export type Pet = Schema.Schema.Type<typeof PetModel>;',
      errors: [{ messageId: 'mismatch' }],
    },
    {
      code: 'type PetDetailSearch = typeof PetDetailSearchSchema.Type;',
      options: [{ exemptSchemaPattern: '(Table|Form)Schema$' }],
      errors: [{ messageId: 'mismatch' }],
    },
  ],
});
