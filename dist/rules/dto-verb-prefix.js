import { defineRule } from '@oxlint/plugins';
import * as Predicate from 'effect/Predicate';
const DEFAULT_VERBS = [
    'Create',
    'Insert',
    'Update',
    'Upsert',
    'Delete',
    'Remove',
    'Assign',
    'Unassign',
    'Ensure',
    'Configure',
    'Set',
    'Add',
    'Replace',
    'Attach',
    'Detach',
    'Ban',
    'Unban',
    'Deactivate',
    'Reactivate',
    'Rename',
    'Request',
    'Complete',
    'Correct',
    'Import',
    'Override',
    'Record',
    'Reopen',
    'Run',
    'Start',
    'Stop',
    'Trigger',
];
/**
 * `Dto` names a write payload, with the verb in front (`UpdateCustomerDto`).
 * Flags PascalCase `*Dto` declarations whose first word is not a write verb.
 */
export default defineRule({
    meta: {
        type: 'suggestion',
        schema: [
            {
                type: 'object',
                properties: { verbs: { type: 'array', items: { type: 'string' } } },
                additionalProperties: false,
            },
        ],
        messages: {
            noVerb: "'{{name}}' ends in Dto but does not start with a known write verb. Dto names a write (verb first, e.g. UpdateCustomerDto); name read and response shapes with a projection noun (CustomerDetail, PetSummary). If '{{name}}' does name a write, add its verb to this rule's `verbs` option, or propose it for the plugin's defaults.",
        },
    },
    create(context) {
        const [first] = context.options;
        const configured = Predicate.isObject(first) ? first.verbs : undefined;
        // Configured verbs extend the defaults, so a project lists only its own.
        const verbs = Array.isArray(configured)
            ? [...DEFAULT_VERBS, ...configured.filter(Predicate.isString)]
            : DEFAULT_VERBS;
        const startsWithVerb = new RegExp(`^(${verbs.join('|')})[A-Z]`);
        const check = (id) => {
            if (id?.type !== 'Identifier')
                return;
            const name = id.name;
            const isUnprefixedDto = /^[A-Z]\w*Dto$/.test(name) && !startsWithVerb.test(name);
            if (!isUnprefixedDto)
                return;
            context.report({ node: id, messageId: 'noVerb', data: { name } });
        };
        return {
            VariableDeclarator: (node) => check(node.id),
            TSTypeAliasDeclaration: (node) => check(node.id),
            TSInterfaceDeclaration: (node) => check(node.id),
            ClassDeclaration: (node) => check(node.id),
        };
    },
});
