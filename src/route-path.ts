import path from 'node:path';

const ROUTES_ALIAS = '#routes/';

/** The `src/routes/` segment of an absolute path, with separators on both sides. */
export const ROUTES_MARKER = `${path.sep}src${path.sep}routes${path.sep}`;

/** Absolute path a specifier points at, or null when it is neither relative nor a `#routes/` import. */
export const resolveRouteSpecifier = (
  specifier: string,
  filename: string
): string | null => {
  if (specifier.startsWith('.'))
    return path.resolve(path.dirname(filename), specifier);
  if (!specifier.startsWith(ROUTES_ALIAS)) return null;
  const srcMarker = `${path.sep}src${path.sep}`;
  const srcIndex = filename.lastIndexOf(srcMarker);
  if (srcIndex === -1) return null;
  return path.join(
    filename.slice(0, srcIndex),
    'src',
    'routes',
    specifier.slice(ROUTES_ALIAS.length)
  );
};
