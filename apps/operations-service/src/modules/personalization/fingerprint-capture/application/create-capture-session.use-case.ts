import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseVerifiedActor, requireUserActor } from '@app/common';
import {
  CAPTURE_MAX_ATTEMPTS,
  type CaptureSession,
  type CreateCaptureSessionRequest,
} from '@app/contracts';
import {
  ORDER_PERSONALIZATION_CONTEXT_PORT,
  type OrderPersonalizationContextPort,
} from '../../shared/order-context/order-personalization-context.port';
import {
  CAPTURE_DEVICE_GATEWAY,
  type CaptureDeviceGateway,
} from './capture-device.gateway';
import {
  CAPTURE_CONFIG,
  expiryWindow,
  type CaptureConfig,
} from './capture.config';
import { captureErrors, CaptureReason } from './capture.errors';
import { sessionExpiresAt, toCaptureSession } from './capture.mapper';
import {
  CAPTURE_REPOSITORY,
  type CaptureRepository,
} from './capture.repository';
import { requireKnownDevice, requireUuid } from './capture.validation';

/** PERSO-005. Order and payment facts come only from Commerce. */
@Injectable()
export class CreateCaptureSessionUseCase {
  private readonly logger = new Logger(CreateCaptureSessionUseCase.name);

  constructor(
    @Inject(CAPTURE_REPOSITORY) private readonly sessions: CaptureRepository,
    @Inject(ORDER_PERSONALIZATION_CONTEXT_PORT)
    private readonly orders: OrderPersonalizationContextPort,
    @Inject(CAPTURE_DEVICE_GATEWAY)
    private readonly device: CaptureDeviceGateway,
    @Inject(CAPTURE_CONFIG) private readonly config: CaptureConfig,
  ) {}

  async execute(request: CreateCaptureSessionRequest): Promise<CaptureSession> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));
    const orderId = requireUuid(
      request.orderId,
      CaptureReason.INVALID_ORDER_ID,
    );
    const consentId = requireUuid(
      request.consentId,
      CaptureReason.INVALID_CONSENT_ID,
    );
    const deviceCode = requireKnownDevice(request.deviceCode, this.config);

    // Throws (503) when Commerce is down: fail closed, never "not found".
    const order = await this.orders.getOrderPersonalizationContext(orderId);
    if (order === undefined) {
      throw captureErrors.notFound(CaptureReason.ORDER_NOT_FOUND);
    }
    const consent = await this.sessions.findConsent(consentId);
    if (consent === undefined || consent.orderId.toLowerCase() !== orderId) {
      throw captureErrors.notFound(CaptureReason.CONSENT_NOT_FOUND);
    }
    if (consent.status !== 'ACCEPTED') {
      throw captureErrors.precondition(CaptureReason.CONSENT_NOT_ACCEPTED);
    }
    if (consent.consentType !== 'FINGERPRINT_PROCESSING') {
      throw captureErrors.precondition(CaptureReason.CONSENT_TYPE_MISMATCH);
    }
    if (!order.p1Paid) {
      throw captureErrors.precondition(CaptureReason.P1_NOT_PAID);
    }
    const orderItems = new Map(
      order.ringItems.map((item) => [item.ringItemId.toLowerCase(), item]),
    );
    const everyItemStillFingerprint =
      consent.ringItemIds.length > 0 &&
      consent.ringItemIds.every(
        (id) =>
          orderItems.get(id.toLowerCase())?.personalizationPackage ===
          'FINGERPRINT',
      );
    if (!everyItemStillFingerprint) {
      throw captureErrors.precondition(CaptureReason.PACKAGE_MISMATCH);
    }

    const window = expiryWindow(this.config, new Date());
    const session = await this.sessions.createSession({
      ...window,
      orderId,
      consentId,
      deviceCode,
      staffUserId: actor.userId,
      sourcePlanMode: order.sourcePlanMode,
    });

    // After commit. A failed publish is not an error: the device can ask again (hello).
    try {
      await this.device.publishStart(deviceCode, {
        type: 'start',
        sessionId: session.id,
        expiresAt: sessionExpiresAt(session, this.config).toISOString(),
        maxAttempts: CAPTURE_MAX_ATTEMPTS,
      });
    } catch (error) {
      this.logger.warn(
        `Start command for session ${session.id} was not published: ${describe(error)}`,
      );
    }
    return toCaptureSession(session, this.config);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
