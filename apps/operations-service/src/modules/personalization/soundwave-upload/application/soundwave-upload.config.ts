/** Runtime settings for Soundwave uploads (from OPERATIONS_SOUNDWAVE_UPLOAD_*). */
export interface SoundwaveUploadConfig {
  /** Lifetime of the presigned PUT URL. */
  readonly uploadUrlTtlSeconds: number;
}

export const SOUNDWAVE_UPLOAD_CONFIG = Symbol('SOUNDWAVE_UPLOAD_CONFIG');

/** Object key of the raw upload. It contains the source id, never anything customer-supplied. */
export function soundwaveRawAssetKey(sourceId: string): string {
  return `personalization/sources/${sourceId}/raw`;
}

export const SOUNDWAVE_SOURCE_TYPE = 'SOUNDWAVE';
export const SOUNDWAVE_CONSENT_TYPE = 'SOUNDWAVE_PROCESSING';
export const SOUNDWAVE_PACKAGE = 'SOUNDWAVE';

/** delete_reason values written with status DELETED. */
export const DELETE_REASON_SUPERSEDED = 'SUPERSEDED';
export const DELETE_REASON_UPLOAD_INVALID = 'UPLOAD_INVALID';

/** Statuses for which a repeated complete returns the source unchanged. */
export const COMPLETED_SOURCE_STATUSES: readonly string[] = [
  'ACCEPTED',
  'PROCESSING',
  'READY',
];
