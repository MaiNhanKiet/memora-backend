import { CAPTURE_MAX_ATTEMPTS } from '@app/contracts';
import {
  CAPTURE_DEVICE_CODE_PATTERN,
  type CaptureConfig,
} from './capture.config';
import { captureErrors, CaptureReason } from './capture.errors';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUuid(value: string | undefined, reason: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw captureErrors.invalid(reason);
  }
  return value.toLowerCase();
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

/** Malformed codes are INVALID_DEVICE_CODE; well-formed but unregistered are UNKNOWN_DEVICE. */
export function requireKnownDevice(
  value: string | undefined,
  config: CaptureConfig,
): string {
  if (typeof value !== 'string' || !CAPTURE_DEVICE_CODE_PATTERN.test(value)) {
    throw captureErrors.invalid(CaptureReason.INVALID_DEVICE_CODE);
  }
  if (!config.allowedDeviceCodes.has(value)) {
    throw captureErrors.invalid(CaptureReason.UNKNOWN_DEVICE);
  }
  return value;
}

/** The staff names an attempt by its number (1..3). */
export function requireAttemptNo(value: number | undefined): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > CAPTURE_MAX_ATTEMPTS
  ) {
    throw captureErrors.invalid(CaptureReason.INVALID_ATTEMPT_NO);
  }
  return value;
}
