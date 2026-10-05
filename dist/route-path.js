import fs from 'node:fs';
import path from 'node:path';
import * as Predicate from 'effect/Predicate';
const ROUTES_ALIAS = '#routes/';
/** The `src/routes/` segment of an absolute path, with separators on both sides. */
export const ROUTES_MARKER = `${path.sep}src${path.sep}routes${path.sep}`;
/** Absolute path a specifier points at, or null when it is neither relative nor a `#routes/` import. */
export const resolveRouteSpecifier = (specifier, filename) => {
    if (specifier.startsWith('.'))
        return path.resolve(path.dirname(filename), specifier);
    if (!specifier.startsWith(ROUTES_ALIAS))
        return null;
    const segments = filename.split(path.sep);
    // The alias belongs to the nearest `src/` that holds a `routes/` folder; a
    // folder inside it may be named `src` too.
    const routesRoots = segments
        .flatMap((segment, index) => {
        const isSourceFolder = segment === 'src' && index < segments.length - 1;
        return isSourceFolder
            ? [path.join(segments.slice(0, index + 1).join(path.sep), 'routes')]
            : [];
    })
        .toReversed();
    const routesRoot = routesRoots.find((candidate) => fs.existsSync(candidate)) ?? routesRoots[0];
    if (Predicate.isUndefined(routesRoot))
        return null;
    return path.join(routesRoot, specifier.slice(ROUTES_ALIAS.length));
};
