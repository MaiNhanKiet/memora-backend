/** Runtime settings for Soundwave uploads (from OPERATIONS_SOUNDWAVE_UPLOAD_*). */
export interface SoundwaveUploadConfig {
  /** Lifetime of the presigned PUT URL. */
  readonly uploadUrlTtlSeconds: number;
}

export const SOUNDWAVE_UPLOAD_CONFIG = Symbol('SOUNDWAVE_UPLOAD_CONFIG');

const RAW_EXTENSIONS: Readonly<Record<string, string>> = {
  'audio/wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
};

/**
 * Object key of the raw upload: order id, source id and an extension derived from the
 * validated content type; nothing customer-supplied. The content type is validated
 * before this is called, so an unknown one is a programming error.
 */
export function soundwaveRawAssetKey(
  orderId: string,
  sourceId: string,
  contentType: string,
): string {
  const extension = RAW_EXTENSIONS[contentType];
  if (extension === undefined) {
    throw new Error(`Unsupported soundwave content type: ${contentType}`);
  }
  return `personalization/soundwave/${orderId}/uploads/${sourceId}/raw.${extension}`;
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

/** PERSO-031: how long the worker's style list is reused before it is fetched again. */
export const SOUNDWAVE_STYLES_CACHE_TTL_MS = 10 * 60 * 1000;
