import rule from '../src/rules/dto-verb-prefix.ts';
import { tsTester as tester } from './tester.ts';

tester.run('dto-verb-prefix', rule, {
  valid: [
    'const UpdateCustomerDto = 1; type UpdateCustomerDto = string;',
    'type InsertPetDto = string;',
    'interface UpsertAddressDto {}',
    // Lower-case identifiers are values of a Dto, not Dto declarations.
    'const createPetDto = {}; const vCreateCustomerWorkflowDto = 1;',
    'type CustomerDetail = string;',
    { code: 'type BanPetDto = string;', options: [{ verbs: ['Ban'] }] },
  ],
  invalid: [
    { code: 'type CustomerDto = string;', errors: [{ messageId: 'noVerb' }] },
    { code: 'const PetSummaryDto = 1;', errors: [{ messageId: 'noVerb' }] },
    { code: 'interface GetPetDto {}', errors: [{ messageId: 'noVerb' }] },
    // The verb must be a whole word.
    { code: 'type SettingsDto = string;', errors: [{ messageId: 'noVerb' }] },
  ],
});
