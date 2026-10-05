import * as Predicate from 'effect/Predicate';

export const LAYERS = [
  'domain',
  'application',
  'infrastructure',
  'presentation',
] as const;

export type Layer = (typeof LAYERS)[number];

const MODULE_PATH = new RegExp(
  `/confect/modules/([^/]+)(?:/(${LAYERS.join('|')}))?(?:/(.+))?$`
);

/** Locates a path inside `confect/modules`, or null when it is outside. */
export const locate = (absolutePath: string) => {
  const normalized = absolutePath
    .replaceAll('\\', '/')
    .replace(/\.[cm]?[jt]s$/, '')
    .replace(/\/index$/, '');
  const match = MODULE_PATH.exec(normalized);
  if (Predicate.isNull(match)) return null;
  const [, module, layerName, rest] = match;
  if (Predicate.isUndefined(module)) return null;
  const layer = LAYERS.find((candidate) => candidate === layerName) ?? null;
  return { module, layer, rest: rest ?? null };
};
