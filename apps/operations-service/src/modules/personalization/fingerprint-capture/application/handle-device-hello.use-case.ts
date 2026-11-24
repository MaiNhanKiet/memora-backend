import { Inject, Injectable, Logger } from '@nestjs/common';
import { CAPTURE_MAX_ATTEMPTS } from '@app/contracts';
import {
  CAPTURE_DEVICE_GATEWAY,
  type CaptureDeviceGateway,
} from './capture-device.gateway';
import {
  CAPTURE_CONFIG,
  expiryWindow,
  type CaptureConfig,
} from './capture.config';
import { sessionExpiresAt } from './capture.mapper';
import {
  CAPTURE_REPOSITORY,
  type CaptureRepository,
} from './capture.repository';

/** PERSO-007 hello: a (re)connected device gets its open session's start command again. */
@Injectable()
export class HandleDeviceHelloUseCase {
  private readonly logger = new Logger(HandleDeviceHelloUseCase.name);

  constructor(
    @Inject(CAPTURE_REPOSITORY) private readonly sessions: CaptureRepository,
    @Inject(CAPTURE_DEVICE_GATEWAY)
    private readonly device: CaptureDeviceGateway,
    @Inject(CAPTURE_CONFIG) private readonly config: CaptureConfig,
  ) {}

  /** `deviceCode` comes from the MQTT topic, never from the payload. */
  async execute(deviceCode: string): Promise<void> {
    const session = await this.sessions.findOpenSessionForDevice(
      deviceCode,
      expiryWindow(this.config, new Date()),
    );
    if (session === undefined) {
      return;
    }
    // A fully used session (3 attempts, none accepted) is already FAILED, so it is not open.
    await this.device.publishStart(deviceCode, {
      type: 'start',
      sessionId: session.id,
      expiresAt: sessionExpiresAt(session, this.config).toISOString(),
      maxAttempts: CAPTURE_MAX_ATTEMPTS,
    });
    this.logger.log(`Re-sent start for session ${session.id} to ${deviceCode}`);
  }
}
