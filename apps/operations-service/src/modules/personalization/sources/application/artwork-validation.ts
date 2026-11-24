import {
  ARTWORK_MAX_POINTS,
  ARTWORK_MAX_STROKES,
  ARTWORK_OFFSET_MAX,
  ARTWORK_OFFSET_MIN,
  ARTWORK_STROKE_RADIUS_MAX,
  ARTWORK_STROKE_RADIUS_MIN,
  ARTWORK_ZOOM_MAX,
  ARTWORK_ZOOM_MIN,
  FINGERPRINT_SHAPES,
  type CreateFingerprintCropRequest,
} from '@app/contracts';
import type { EraseStrokeInput } from '../../shared/source-processing/application/processing-worker.port';
import { sourceErrors, SourceReason } from './sources.errors';

export interface ValidCrop {
  readonly shape: string;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly zoom: number;
  readonly eraseStrokes: readonly EraseStrokeInput[];
}

function between(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

/** Static limits, checked again here even though the Gateway DTO checks them first. */
export function validateCrop(request: CreateFingerprintCropRequest): ValidCrop {
  const shape = FINGERPRINT_SHAPES.find((item) => item === request.shape);
  if (shape === undefined) {
    throw sourceErrors.invalid(SourceReason.INVALID_SHAPE);
  }
  if (
    !between(request.offsetX, ARTWORK_OFFSET_MIN, ARTWORK_OFFSET_MAX) ||
    !between(request.offsetY, ARTWORK_OFFSET_MIN, ARTWORK_OFFSET_MAX)
  ) {
    throw sourceErrors.invalid(SourceReason.INVALID_OFFSET);
  }
  if (!between(request.zoom, ARTWORK_ZOOM_MIN, ARTWORK_ZOOM_MAX)) {
    throw sourceErrors.invalid(SourceReason.INVALID_ZOOM);
  }
  const strokes = request.eraseStrokes ?? [];
  if (!Array.isArray(strokes) || strokes.length > ARTWORK_MAX_STROKES) {
    throw sourceErrors.invalid(SourceReason.INVALID_ERASE_STROKES);
  }
  const eraseStrokes: EraseStrokeInput[] = strokes.map((stroke) => {
    const points = stroke.points;
    if (
      !between(
        stroke.radius,
        ARTWORK_STROKE_RADIUS_MIN,
        ARTWORK_STROKE_RADIUS_MAX,
      ) ||
      !Array.isArray(points) ||
      points.length < 1 ||
      points.length > ARTWORK_MAX_POINTS
    ) {
      throw sourceErrors.invalid(SourceReason.INVALID_ERASE_STROKES);
    }
    return {
      radius: stroke.radius,
      points: points.map((point): [number, number] => {
        if (!between(point.x, 0, 1) || !between(point.y, 0, 1)) {
          throw sourceErrors.invalid(SourceReason.INVALID_ERASE_STROKES);
        }
        return [point.x, point.y];
      }),
    };
  });
  return {
    shape,
    offsetX: request.offsetX,
    offsetY: request.offsetY,
    zoom: request.zoom,
    eraseStrokes,
  };
}

const VERSION_ID = /^v\d{1,4}$/;

export function requireVersionId(value: unknown): string {
  if (typeof value !== 'string' || !VERSION_ID.test(value)) {
    throw sourceErrors.invalid(SourceReason.INVALID_VERSION_ID);
  }
  return value;
}
