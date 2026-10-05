# oxlint-plugin-effect-standards

Oxlint rules that enforce coding standards for Effect, Confect and TanStack Router projects. The plugin's rule prefix is `effect-standards`.

## Install

The package is installed from this repository, pinned to a tag:

```bash
pnpm add -D github:daguttt/oxlint-plugin-effect-standards#v0.1.1
```

It is tested with oxlint 1.82.0. The compiled `dist/` is committed, so installing runs no build script.

To upgrade, change the tag in `package.json` and run `pnpm install`.

## Configure

Extend the fragments you want from `.oxlintrc.json`. Each one loads the plugin and turns its rules on as errors.

```jsonc
// .oxlintrc.json at the repository root
{
  "extends": [
    "./node_modules/oxlint-plugin-effect-standards/configs/general.json",
  ],
}
```

```jsonc
// packages/backend/.oxlintrc.json
{
  "extends": [
    "../../.oxlintrc.json",
    "../../node_modules/oxlint-plugin-effect-standards/configs/backend.json",
  ],
  "overrides": [
    {
      "files": ["**/*.test.ts", "**/test.setup.ts", "**/*.fixtures.ts"],
      "rules": { "effect-standards/no-dynamic-import": "off" },
    },
  ],
}
```

```jsonc
// apps/frontend/.oxlintrc.json
{
  "extends": [
    "../../.oxlintrc.json",
    "../../node_modules/oxlint-plugin-effect-standards/configs/frontend.json",
  ],
}
```

To pick rules one by one instead, add `"jsPlugins": ["oxlint-plugin-effect-standards"]` and list them under `rules`.

Oxlint does not apply an extended file's `overrides` reliably, so the fragments carry rules only. File-scoped exceptions, like the test override above, belong in your own config.

### Tailwind stylesheet

`tailwind-class-strings` recognises a class list under a neutral name (`const tones = { red: 'border-red-500 bg-red-50' }`) by asking Tailwind whether every token is a utility. Point the plugin at the project's Tailwind entry stylesheet in the root `package.json`:

```json
{
  "oxlint-plugin-effect-standards": {
    "tailwindStylesheet": "./apps/frontend/src/index.css"
  }
}
```

The plugin reads the nearest `package.json` with this key, looking up from the directory oxlint runs in, and needs `tailwindcss` 4.1 or later installed in the project. Without the key, the rule still checks strings bound to class-like names (`rowClassName`, `ROW_CLASSES`).

## Rules

### General (`configs/general.json`)

| Rule                           | Enforces                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `prefer-predicate-nullability` | `Predicate.isNull`, `isUndefined`, `isNullish` and their negations over raw comparisons. Autofix.     |
| `no-try-catch`                 | `Result.try` or Effect error handling over synchronous `try`/`catch`.                                 |
| `no-else`                      | Early returns over `else` after a branch that always exits.                                           |
| `no-inline-compound-condition` | A named constant for a condition with two or more operands.                                           |
| `effect-all-concurrency`       | An explicit `concurrency` option on `Effect.all`.                                                     |
| `schema-type-name`             | A schema and its decoded type share one name.                                                         |
| `dto-verb-prefix`              | A `*Dto` name starts with a write verb. Option: `verbs`, extra verbs accepted on top of the defaults. |

### Backend (`configs/backend.json`)

These key off the Confect layout `src/confect/modules/<module>/{domain,application,infrastructure,presentation}` and `src/confect/tables/*.ts`.

| Rule                             | Enforces                                                                   |
| -------------------------------- | -------------------------------------------------------------------------- |
| `backend-layer-direction`        | Layers import only the layers they may depend on; the domain stays pure.   |
| `backend-layer-namespace-import` | Layer modules are imported as namespaces named after module and layer.     |
| `backend-load-context-imports`   | Table and spec files import only what Convex can load in their context.    |
| `table-adapter`                  | A table file default-exports `Table.make(() => <X>Domain.<Y>TableSchema)`. |
| `table-schema-location`          | `*TableSchema` values are declared in a module's `domain/models.ts`.       |
| `no-dynamic-import`              | No `import()` expressions.                                                 |

### Frontend (`configs/frontend.json`)

These key off the aliases `#modules/*` and `#routes/*`, TanStack Router file routes under `src/routes`, and route-local `-feat/` directories.

| Rule                               | Enforces                                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend-module-namespace-import` | `#modules/<name>` is imported as a namespace named after the module.                                                                                          |
| `frontend-route-namespace-import`  | Routes and route features are imported as `*Route` and `*RouteFeat` namespaces.                                                                               |
| `route-feat-barrel`                | Every `-feat/` directory has an `index.ts` barrel that exports first.                                                                                         |
| `route-feat-public-api`            | Other files import a `-feat/` directory through its barrel.                                                                                                   |
| `route-feat-shared-code`           | Only a route and the routes nested under it use its `-feat/`; an export two unrelated routes share does not sit in an ancestor's `-feat/` that never uses it. |
| `tailwind-class-strings`           | Tailwind class strings outside `className` are wrapped in `tw` or `cn`.                                                                                       |

`route-feat-shared-code` reads the other route files from disk to see who else uses an export, so an editor shows a stale result until the other file is saved. It follows TanStack Router's default file naming (`index`, `route`, `lazy`, flat `a.b.tsx` files, dotted folders, `__root`); custom route tokens and prefixes are not modelled.

## Develop

```bash
pnpm install
pnpm feedback   # format, lint, typecheck, test, and check dist is current
```

Rules live in `src/rules`, one per file, with a matching test in `test`. The repository lints itself with its own general rules.

## Release

1. Run `pnpm build` and commit `dist/` together with the source change. CI fails when they differ.
2. Bump `version` in `package.json`.
3. Tag the commit (`git tag v0.2.0`) and push the tag.
