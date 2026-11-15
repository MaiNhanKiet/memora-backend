import { CAPTURE_TOPIC_PREFIX } from '../../application/capture-topics';
import { isUuid } from '../../application/capture.validation';
import type { DeviceAttemptMessage } from '../../application/record-capture-attempt.use-case';

/** Broker limit is 256 KB; anything larger is dropped without parsing. */
export const MAX_PAYLOAD_BYTES = 262_144;

const TOPIC = new RegExp(
  `^${CAPTURE_TOPIC_PREFIX}/([A-Za-z0-9_-]{1,80})/(attempts|hello)$`,
);
const NONCE = /^[A-Za-z0-9_-]{16,64}$/;
const FIRMWARE_VERSION = /^[\x20-\x7E]{1,40}$/;

export interface ParsedTopic {
  readonly deviceCode: string;
  readonly kind: 'attempts' | 'hello';
}

/** The device code comes only from the topic, validated here. */
export function parseCaptureTopic(topic: string): ParsedTopic | undefined {
  const match = TOPIC.exec(topic);
  if (match === null) {
    return undefined;
  }
  return { deviceCode: match[1], kind: match[2] as ParsedTopic['kind'] };
}

export type ParsedAttempt =
  | { readonly kind: 'VALID'; readonly message: DeviceAttemptMessage }
  /** sessionId and nonce are usable, so the device gets an INVALID_MESSAGE result. */
  | {
      readonly kind: 'INVALID';
      readonly sessionId: string;
      readonly nonce: string;
    }
  /** Not even sessionId and nonce are usable: nothing to answer, log only. */
  | { readonly kind: 'DROP' };

export function parseAttemptPayload(
  deviceCode: string,
  payload: Buffer,
): ParsedAttempt {
  if (payload.byteLength > MAX_PAYLOAD_BYTES) {
    return { kind: 'DROP' };
  }
  let body: unknown;
  try {
    body = JSON.parse(payload.toString('utf8'));
  } catch {
    return { kind: 'DROP' };
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { kind: 'DROP' };
  }
  const record = body as Record<string, unknown>;
  const { sessionId, nonce, qualityScore, imageBase64, firmwareVersion } =
    record;
  if (!isUuid(sessionId) || typeof nonce !== 'string' || !NONCE.test(nonce)) {
    return { kind: 'DROP' };
  }
  const id = sessionId.toLowerCase();

  // A CAPTURE_FAILED attempt carries no image and may omit the score.
  const noImage = imageBase64 === undefined || imageBase64 === '';
  const score = qualityScore === undefined && noImage ? 0 : qualityScore;
  const scoreOk =
    typeof score === 'number' &&
    Number.isFinite(score) &&
    score >= 0 &&
    score <= 1000;
  const imageOk = imageBase64 === undefined || typeof imageBase64 === 'string';
  const firmwareOk =
    firmwareVersion === undefined ||
    (typeof firmwareVersion === 'string' &&
      FIRMWARE_VERSION.test(firmwareVersion));
  if (!scoreOk || !imageOk || !firmwareOk) {
    return { kind: 'INVALID', sessionId: id, nonce };
  }
  return {
    kind: 'VALID',
    message: {
      deviceCode,
      sessionId: id,
      nonce,
      qualityScore: score,
      imageBase64: imageBase64,
      firmwareVersion: firmwareVersion,
    },
  };
}
