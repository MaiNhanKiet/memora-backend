/** Runtime settings for fingerprint capture (from OPERATIONS_CAPTURE_*). */
export interface CaptureConfig {
  readonly sessionTtlSeconds: number;
  readonly qualityThreshold: number;
  readonly allowedDeviceCodes: ReadonlySet<string>;
}

export const CAPTURE_CONFIG = Symbol('CAPTURE_CONFIG');

/** Raw AS608 image limit after base64 decoding. Its base64 stays under the 256 KB broker limit. */
export const CAPTURE_MAX_IMAGE_BYTES = 180_000;

/** Device images are 8-bit grayscale BMP (256x288). */
export const CAPTURE_IMAGE_CONTENT_TYPE = 'image/bmp';

/** Lifetime of the presigned staff-confirmation image URL (PERSO-026). */
export const CAPTURE_IMAGE_URL_TTL_SECONDS = 60;

export const CAPTURE_DEVICE_CODE_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

/** Sessions created before `expireCreatedBefore` are expired (lazy expiry, D-P-11). */
export function expiryWindow(
  config: CaptureConfig,
  now: Date,
): { now: Date; expireCreatedBefore: Date } {
  return {
    now,
    expireCreatedBefore: new Date(
      now.getTime() - config.sessionTtlSeconds * 1000,
    ),
  };
}
