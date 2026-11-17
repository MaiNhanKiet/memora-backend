import type { DeviceErrorReason } from './capture.errors';

export interface StartCommand {
  readonly type: 'start';
  readonly sessionId: string;
  readonly expiresAt: string;
  readonly maxAttempts: number;
}

export interface EndCommand {
  readonly type: 'end';
  readonly sessionId: string;
  readonly status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  /** Only with COMPLETED: the attempt the staff picked. */
  readonly acceptedAttemptNo?: number;
}

/** The staff asks for another scan (PERSO-028). */
export interface NextCommand {
  readonly type: 'next';
  readonly sessionId: string;
  readonly attemptNo: number;
}

export interface DeviceOkResult {
  readonly sessionId: string;
  readonly nonce: string;
  readonly ok: true;
  readonly attemptNo: number;
  /** PENDING_REVIEW (waiting for the staff) or REJECTED. */
  readonly result: string;
  /** PASS | LOW_QUALITY, only with PENDING_REVIEW. */
  readonly suggestion?: string;
  /** `STAFF_REJECTED` when the staff rejected the image. */
  readonly reason?: string;
  readonly remainingAttempts: number;
  readonly sessionStatus: string;
}

export interface DeviceErrorResult {
  readonly sessionId: string;
  readonly nonce: string;
  readonly ok: false;
  readonly error: DeviceErrorReason;
}

export type DeviceResult = DeviceOkResult | DeviceErrorResult;

/** Operations to device channel (MQTT in production). Use cases never import mqtt. */
export interface CaptureDeviceGateway {
  /** Rejects on failure; callers log and continue (the session already exists). */
  publishStart(deviceCode: string, command: StartCommand): Promise<void>;
  publishResult(deviceCode: string, result: DeviceResult): Promise<void>;
  /** The session ended (COMPLETED, FAILED or CANCELLED): the device returns to idle. */
  publishEnd(deviceCode: string, command: EndCommand): Promise<void>;
  /** Rejects on failure; callers log and continue (the staff can press again). */
  publishNext(deviceCode: string, command: NextCommand): Promise<void>;
}

export const CAPTURE_DEVICE_GATEWAY = Symbol('CAPTURE_DEVICE_GATEWAY');

export type CaptureMessageHandler = (
  topic: string,
  payload: Buffer,
) => Promise<void>;

/** Device to Operations channel. Started once by the inbound adapter, after its handler exists. */
export interface CaptureMessageSource {
  start(handler: CaptureMessageHandler): void;
}

export const CAPTURE_MESSAGE_SOURCE = Symbol('CAPTURE_MESSAGE_SOURCE');
