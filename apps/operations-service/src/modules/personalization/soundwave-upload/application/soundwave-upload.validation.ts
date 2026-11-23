import {
  SOUNDWAVE_CONTENT_TYPES,
  SOUNDWAVE_DEFAULT_WAVECODE_STYLE,
  SOUNDWAVE_MAX_DURATION_MS,
  SOUNDWAVE_MAX_SIZE_BYTES,
  SOUNDWAVE_MIN_DURATION_MS,
  SOUNDWAVE_UPLOAD_ORIGINS,
  SOUNDWAVE_WAVECODE_STYLES,
  type SoundwaveContentType,
  type SoundwaveUploadOrigin,
  type SoundwaveWavecodeStyle,
} from '@app/contracts';
import {
  soundwaveUploadErrors,
  SoundwaveUploadReason,
} from './soundwave-upload.errors';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_HEX = /^[0-9a-f]{64}$/i;

export function requireUuid(value: unknown, reason: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw soundwaveUploadErrors.invalid(reason);
  }
  return value.toLowerCase();
}

export function requireContentType(value: unknown): SoundwaveContentType {
  const match = SOUNDWAVE_CONTENT_TYPES.find((type) => type === value);
  if (match === undefined) {
    throw soundwaveUploadErrors.invalid(
      SoundwaveUploadReason.INVALID_CONTENT_TYPE,
    );
  }
  return match;
}

export function requireOrigin(value: unknown): SoundwaveUploadOrigin {
  const match = SOUNDWAVE_UPLOAD_ORIGINS.find((origin) => origin === value);
  if (match === undefined) {
    throw soundwaveUploadErrors.invalid(SoundwaveUploadReason.INVALID_ORIGIN);
  }
  return match;
}

export function requireSizeBytes(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > SOUNDWAVE_MAX_SIZE_BYTES
  ) {
    throw soundwaveUploadErrors.invalid(SoundwaveUploadReason.INVALID_SIZE);
  }
  return value;
}

/** Hex is stored lower-case. */
export function requireSha256(value: unknown): string {
  if (typeof value !== 'string' || !SHA256_HEX.test(value)) {
    throw soundwaveUploadErrors.invalid(SoundwaveUploadReason.INVALID_SHA256);
  }
  return value.toLowerCase();
}

export function requireDurationMs(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < SOUNDWAVE_MIN_DURATION_MS ||
    value > SOUNDWAVE_MAX_DURATION_MS
  ) {
    throw soundwaveUploadErrors.invalid(
      SoundwaveUploadReason.AUDIO_DURATION_INVALID,
    );
  }
  return value;
}

export function requireSegmentStartMs(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw soundwaveUploadErrors.invalid(
      SoundwaveUploadReason.INVALID_SEGMENT_START,
    );
  }
  return value;
}
/** Unset, null or empty means the default (CLASSIC). Checked against a static list, never the worker. */
export function requireWavecodeStyle(value: unknown): SoundwaveWavecodeStyle {
  if (value === undefined || value === null || value === '') {
    return SOUNDWAVE_DEFAULT_WAVECODE_STYLE;
  }
  const match = SOUNDWAVE_WAVECODE_STYLES.find((style) => style === value);
  if (match === undefined) {
    throw soundwaveUploadErrors.invalid(
      SoundwaveUploadReason.INVALID_WAVECODE_STYLE,
    );
  }
  return match;
}
