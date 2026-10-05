import { definePlugin } from '@oxlint/plugins';

import backendLayerDirection from './rules/backend-layer-direction.ts';
import backendLayerNamespaceImport from './rules/backend-layer-namespace-import.ts';
import backendLoadContextImports from './rules/backend-load-context-imports.ts';
import dtoVerbPrefix from './rules/dto-verb-prefix.ts';
import effectAllConcurrency from './rules/effect-all-concurrency.ts';
import frontendModuleNamespaceImport from './rules/frontend-module-namespace-import.ts';
import frontendRouteNamespaceImport from './rules/frontend-route-namespace-import.ts';
import noDynamicImport from './rules/no-dynamic-import.ts';
import noElse from './rules/no-else.ts';
import noInlineCompoundCondition from './rules/no-inline-compound-condition.ts';
import noTryCatch from './rules/no-try-catch.ts';
import preferPredicateNullability from './rules/prefer-predicate-nullability.ts';
import routeFeatBarrel from './rules/route-feat-barrel.ts';
import routeFeatPublicApi from './rules/route-feat-public-api.ts';
import routeFeatSharedCode from './rules/route-feat-shared-code.ts';
import schemaTypeName from './rules/schema-type-name.ts';
import tableAdapter from './rules/table-adapter.ts';
import tableSchemaLocation from './rules/table-schema-location.ts';
import tailwindClassStrings from './rules/tailwind-class-strings.ts';

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
