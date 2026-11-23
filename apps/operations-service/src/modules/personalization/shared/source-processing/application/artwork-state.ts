import type { JsonValue } from './source-processing.repository';

export interface EraseStrokeRecord {
  readonly radius: number;
  /** [x, y] pairs in 0..1. */
  readonly points: readonly (readonly [number, number])[];
}

/** One generated fingerprint design (PERSO-013 makes `v0`, PERSO-038 adds more). */
export interface ArtworkVersion {
  readonly shape: string;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly zoom: number;
  readonly erasedRatio: number;
  readonly ridgeWidthRatio: number;
  readonly minEngraveSizeMm: number;
  readonly coverage: number;
  readonly aspectRatio: number;
  readonly svgKey: string;
  readonly svgSha256: string;
  readonly pngKey: string;
  readonly pngSha256: string;
  readonly hull: readonly (readonly number[])[];
  readonly createdAt: string;
  /** Kept for audit and reproducibility; never returned to a client. */
  readonly eraseStrokes?: readonly EraseStrokeRecord[];
}

/**
 * `personalization_sources.metadata_json.artwork` of a FINGERPRINT source (server side only).
 * `aspectRatio` / `hull` mirror the current version for consumers of the older shape.
 * Without `baseKey` and versions (older worker) the artwork cannot be edited.
 */
export interface ArtworkState {
  readonly aspectRatio?: number;
  readonly hull?: readonly (readonly number[])[];
  readonly baseKey?: string;
  readonly currentVersionId?: string;
  readonly versions: Readonly<Record<string, ArtworkVersion>>;
  readonly acceptedVersionId?: string;
  readonly acceptedAt?: string;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function hullOf(value: unknown): number[][] | undefined {
  return Array.isArray(value) &&
    value.every(
      (point) =>
        Array.isArray(point) && point.every((v) => typeof v === 'number'),
    )
    ? value
    : undefined;
}

function strokesOf(value: unknown): EraseStrokeRecord[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const result: EraseStrokeRecord[] = [];
  for (const raw of value) {
    const item = record(raw);
    const points = item?.points;
    if (
      item === undefined ||
      typeof item.radius !== 'number' ||
      !Array.isArray(points)
    ) {
      return undefined;
    }
    const pairs: [number, number][] = [];
    for (const point of points) {
      if (
        !Array.isArray(point) ||
        typeof point[0] !== 'number' ||
        typeof point[1] !== 'number'
      ) {
        return undefined;
      }
      pairs.push([point[0], point[1]]);
    }
    result.push({ radius: item.radius, points: pairs });
  }
  return result;
}

function version(value: unknown): ArtworkVersion | undefined {
  const item = record(value);
  const hull = hullOf(item?.hull);
  if (
    item === undefined ||
    hull === undefined ||
    typeof item.shape !== 'string' ||
    typeof item.offsetX !== 'number' ||
    typeof item.offsetY !== 'number' ||
    typeof item.zoom !== 'number' ||
    typeof item.erasedRatio !== 'number' ||
    typeof item.ridgeWidthRatio !== 'number' ||
    typeof item.minEngraveSizeMm !== 'number' ||
    typeof item.coverage !== 'number' ||
    typeof item.aspectRatio !== 'number' ||
    typeof item.svgKey !== 'string' ||
    typeof item.svgSha256 !== 'string' ||
    typeof item.pngKey !== 'string' ||
    typeof item.pngSha256 !== 'string' ||
    typeof item.createdAt !== 'string'
  ) {
    return undefined;
  }
  const strokes = strokesOf(item.eraseStrokes);
  return {
    shape: item.shape,
    offsetX: item.offsetX,
    offsetY: item.offsetY,
    zoom: item.zoom,
    erasedRatio: item.erasedRatio,
    ridgeWidthRatio: item.ridgeWidthRatio,
    minEngraveSizeMm: item.minEngraveSizeMm,
    coverage: item.coverage,
    aspectRatio: item.aspectRatio,
    svgKey: item.svgKey,
    svgSha256: item.svgSha256,
    pngKey: item.pngKey,
    pngSha256: item.pngSha256,
    hull,
    createdAt: item.createdAt,
    ...(strokes === undefined ? {} : { eraseStrokes: strokes }),
  };
}

/** Undefined when the metadata has no artwork object at all. */
export function readArtworkState(
  metadata: Readonly<Record<string, unknown>>,
): ArtworkState | undefined {
  const artwork = record(metadata.artwork);
  if (artwork === undefined) {
    return undefined;
  }
  const versions: Record<string, ArtworkVersion> = {};
  const rawVersions = record(artwork.versions);
  for (const [id, raw] of Object.entries(rawVersions ?? {})) {
    const parsed = version(raw);
    if (parsed !== undefined) {
      versions[id] = parsed;
    }
  }
  const hull = hullOf(artwork.hull);
  return {
    ...(typeof artwork.aspectRatio === 'number'
      ? { aspectRatio: artwork.aspectRatio }
      : {}),
    ...(hull === undefined ? {} : { hull }),
    ...(typeof artwork.baseKey === 'string'
      ? { baseKey: artwork.baseKey }
      : {}),
    ...(typeof artwork.currentVersionId === 'string'
      ? { currentVersionId: artwork.currentVersionId }
      : {}),
    versions,
    ...(typeof artwork.acceptedVersionId === 'string'
      ? { acceptedVersionId: artwork.acceptedVersionId }
      : {}),
    ...(typeof artwork.acceptedAt === 'string'
      ? { acceptedAt: artwork.acceptedAt }
      : {}),
  };
}

/** The artwork can be edited only with a base image and at least one version. */
export function isEditable(state: ArtworkState | undefined): boolean {
  return (
    state !== undefined &&
    state.baseKey !== undefined &&
    state.currentVersionId !== undefined &&
    state.versions[state.currentVersionId] !== undefined
  );
}

export function writeArtworkState(
  state: ArtworkState,
): Record<string, JsonValue> {
  const versions: Record<string, JsonValue> = {};
  for (const [id, item] of Object.entries(state.versions)) {
    versions[id] = {
      shape: item.shape,
      offsetX: item.offsetX,
      offsetY: item.offsetY,
      zoom: item.zoom,
      erasedRatio: item.erasedRatio,
      ridgeWidthRatio: item.ridgeWidthRatio,
      minEngraveSizeMm: item.minEngraveSizeMm,
      coverage: item.coverage,
      aspectRatio: item.aspectRatio,
      svgKey: item.svgKey,
      svgSha256: item.svgSha256,
      pngKey: item.pngKey,
      pngSha256: item.pngSha256,
      hull: item.hull.map((point) => [...point]),
      createdAt: item.createdAt,
      ...(item.eraseStrokes === undefined
        ? {}
        : {
            eraseStrokes: item.eraseStrokes.map((stroke) => ({
              radius: stroke.radius,
              points: stroke.points.map((point) => [...point]),
            })),
          }),
    };
  }
  return {
    ...(state.aspectRatio === undefined
      ? {}
      : { aspectRatio: state.aspectRatio }),
    ...(state.hull === undefined
      ? {}
      : { hull: state.hull.map((point) => [...point]) }),
    ...(state.baseKey === undefined ? {} : { baseKey: state.baseKey }),
    ...(state.currentVersionId === undefined
      ? {}
      : { currentVersionId: state.currentVersionId }),
    versions,
    ...(state.acceptedVersionId === undefined
      ? {}
      : { acceptedVersionId: state.acceptedVersionId }),
    ...(state.acceptedAt === undefined ? {} : { acceptedAt: state.acceptedAt }),
  };
}
