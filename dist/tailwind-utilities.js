import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';
/** The `package.json` key a project configures this plugin under. */
const CONFIG_KEY = 'oxlint-plugin-effect-standards';
const PackageManifest = Schema.fromJsonString(Schema.Struct({
    [CONFIG_KEY]: Schema.optional(Schema.Struct({ tailwindStylesheet: Schema.optional(Schema.String) })),
    exports: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
    style: Schema.optional(Schema.String),
    main: Schema.optional(Schema.String),
}));
const readManifest = (directory) => Schema.decodeOption(PackageManifest)(readFileSync(path.join(directory, 'package.json'), 'utf8')).pipe(Option.getOrUndefined);
/**
 * The stylesheet named by `tailwindStylesheet` in the nearest `package.json`
 * that configures this plugin, looking up from `directory`.
 */
const findStylesheet = (directory) => {
    const configured = existsSync(path.join(directory, 'package.json'))
        ? readManifest(directory)?.[CONFIG_KEY]?.tailwindStylesheet
        : undefined;
    if (Predicate.isString(configured))
        return path.resolve(directory, configured);
    const parent = path.dirname(directory);
    return parent === directory ? null : findStylesheet(parent);
};
/** The directory of an installed package, looking up through `node_modules` from `directory`. */
const findPackageDirectory = (directory, name) => {
    const candidate = path.join(directory, 'node_modules', name);
    if (existsSync(path.join(candidate, 'package.json')))
        return candidate;
    const parent = path.dirname(directory);
    return parent === directory ? null : findPackageDirectory(parent, name);
};
/**
 * The project's Tailwind design system, loaded once when the plugin is
 * imported, or `null` when the project configures no stylesheet.
 * `__unstable__loadDesignSystem` is the API the Prettier plugin sorts with;
 * `tailwind-utilities.test.ts` fails if an upgrade changes it.
 */
const designSystem = await (async () => {
    const stylesheet = findStylesheet(process.cwd());
    if (Predicate.isNull(stylesheet))
        return null;
    const { __unstable__loadDesignSystem } = await import('tailwindcss');
    return __unstable__loadDesignSystem(await readFile(stylesheet, 'utf8'), {
        base: path.dirname(stylesheet),
        // Resolves an `@import` the way a bundler does: a relative path, else a package's `style` entry.
        loadStylesheet: async (id, base) => {
            const isPath = id.startsWith('.') || path.isAbsolute(id);
            const resolved = (() => {
                if (isPath)
                    return path.resolve(base, id);
                const segments = id.split('/');
                const nameLength = id.startsWith('@') ? 2 : 1;
                const name = segments.slice(0, nameLength).join('/');
                const subpath = segments.slice(nameLength).join('/');
                const directory = findPackageDirectory(base, name);
                if (Predicate.isNull(directory))
                    throw new Error(`Cannot find the package "${name}" imported from ${base}`);
                const manifest = readManifest(directory);
                const entry = manifest?.exports?.[subpath === '' ? '.' : `./${subpath}`];
                if (Predicate.isString(entry))
                    return path.join(directory, entry);
                const style = Predicate.hasProperty(entry, 'style')
                    ? entry.style
                    : null;
                if (Predicate.isString(style))
                    return path.join(directory, style);
                if (subpath !== '')
                    return path.join(directory, subpath);
                return path.join(directory, manifest?.style ?? manifest?.main ?? 'index.css');
            })();
            return {
                path: resolved,
                base: path.dirname(resolved),
                content: await readFile(resolved, 'utf8'),
            };
        },
    });
})();
// `group` and `peer` mark an element for variants and generate no CSS of their own.
const MARKER_CLASS = /^(?:group|peer)(?:\/[\w-]+)?$/;
/**
 * True when the text is two or more tokens, every one a utility the project's
 * Tailwind generates, and at least one of them unmistakably a class. Bare
 * words are not enough: `"outline"` is a variant name and `"inline flex"` is a
 * CSS display value. Always false when the project configures no stylesheet.
 */
export const isUtilityList = (text) => {
    if (Predicate.isNull(designSystem))
        return false;
    const tokens = text.trim().split(/\s+/).filter(Boolean);
    if (tokens.length < 2)
        return false;
    if (!tokens.some((token) => /[-/\d:[\]!]/.test(token)))
        return false;
    return designSystem
        .getClassOrder(tokens)
        .every(([token, order]) => Predicate.isNotNull(order) || MARKER_CLASS.test(token));
};
