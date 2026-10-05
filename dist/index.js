import { definePlugin } from '@oxlint/plugins';
import backendLayerDirection from './rules/backend-layer-direction.js';
import backendLayerNamespaceImport from './rules/backend-layer-namespace-import.js';
import backendLoadContextImports from './rules/backend-load-context-imports.js';
import dtoVerbPrefix from './rules/dto-verb-prefix.js';
import effectAllConcurrency from './rules/effect-all-concurrency.js';
import frontendModuleNamespaceImport from './rules/frontend-module-namespace-import.js';
import frontendRouteNamespaceImport from './rules/frontend-route-namespace-import.js';
import noDynamicImport from './rules/no-dynamic-import.js';
import noElse from './rules/no-else.js';
import noInlineCompoundCondition from './rules/no-inline-compound-condition.js';
import noTryCatch from './rules/no-try-catch.js';
import preferPredicateNullability from './rules/prefer-predicate-nullability.js';
import routeFeatBarrel from './rules/route-feat-barrel.js';
import routeFeatPublicApi from './rules/route-feat-public-api.js';
import routeFeatSharedCode from './rules/route-feat-shared-code.js';
import schemaTypeName from './rules/schema-type-name.js';
import tableAdapter from './rules/table-adapter.js';
import tableSchemaLocation from './rules/table-schema-location.js';
import tailwindClassStrings from './rules/tailwind-class-strings.js';
export default definePlugin({
    meta: { name: 'effect-standards' },
    rules: {
        'backend-layer-direction': backendLayerDirection,
        'backend-layer-namespace-import': backendLayerNamespaceImport,
        'backend-load-context-imports': backendLoadContextImports,
        'dto-verb-prefix': dtoVerbPrefix,
        'effect-all-concurrency': effectAllConcurrency,
        'frontend-module-namespace-import': frontendModuleNamespaceImport,
        'frontend-route-namespace-import': frontendRouteNamespaceImport,
        'no-dynamic-import': noDynamicImport,
        'no-else': noElse,
        'no-inline-compound-condition': noInlineCompoundCondition,
        'no-try-catch': noTryCatch,
        'prefer-predicate-nullability': preferPredicateNullability,
        'route-feat-barrel': routeFeatBarrel,
        'route-feat-public-api': routeFeatPublicApi,
        'route-feat-shared-code': routeFeatSharedCode,
        'schema-type-name': schemaTypeName,
        'table-adapter': tableAdapter,
        'table-schema-location': tableSchemaLocation,
        'tailwind-class-strings': tailwindClassStrings,
    },
});
