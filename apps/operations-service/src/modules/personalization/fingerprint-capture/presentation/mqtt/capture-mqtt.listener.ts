import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  CAPTURE_DEVICE_GATEWAY,
  CAPTURE_MESSAGE_SOURCE,
  type CaptureDeviceGateway,
  type CaptureMessageSource,
} from '../../application/capture-device.gateway';
import {
  CAPTURE_CONFIG,
  type CaptureConfig,
} from '../../application/capture.config';
import { HandleDeviceHelloUseCase } from '../../application/handle-device-hello.use-case';
import {
  RecordCaptureAttemptUseCase,
  type RecordAttemptReply,
} from '../../application/record-capture-attempt.use-case';
import {
  parseAttemptPayload,
  parseCaptureTopic,
} from './capture-mqtt.messages';

/**
 * Thin MQTT adapter (PERSO-007): parse topic and payload, call one use case, publish the
 * result. Messages from unregistered devices and unparseable messages are dropped with
 * a log line that never contains the payload.
 */
@Injectable()
export class CaptureMqttListener implements OnModuleInit {
  private readonly logger = new Logger(CaptureMqttListener.name);

  constructor(
    @Inject(CAPTURE_MESSAGE_SOURCE)
    private readonly source: CaptureMessageSource,
    @Inject(CAPTURE_DEVICE_GATEWAY)
    private readonly device: CaptureDeviceGateway,
    @Inject(CAPTURE_CONFIG) private readonly config: CaptureConfig,
    private readonly recordAttempt: RecordCaptureAttemptUseCase,
    private readonly hello: HandleDeviceHelloUseCase,
  ) {}

  onModuleInit(): void {
    this.source.start((topic, payload) => this.handle(topic, payload));
  }

  async handle(topic: string, payload: Buffer): Promise<void> {
    const parsed = parseCaptureTopic(topic);
    if (parsed === undefined) {
      this.logger.warn('Dropped a message on an unexpected topic');
      return;
    }
    if (!this.config.allowedDeviceCodes.has(parsed.deviceCode)) {
      this.logger.warn(
        `Dropped a message from unregistered device ${parsed.deviceCode}`,
      );
      return;
    }

    if (parsed.kind === 'hello') {
      try {
        await this.hello.execute(parsed.deviceCode);
      } catch (error) {
        this.logger.error(
          `Hello from ${parsed.deviceCode} failed: ${describe(error)}`,
        );
      }
      return;
    }

    const attempt = parseAttemptPayload(parsed.deviceCode, payload);
    if (attempt.kind === 'DROP') {
      this.logger.warn(
        `Dropped an unparseable attempt from ${parsed.deviceCode}`,
      );
      return;
    }
    const reply: RecordAttemptReply =
      attempt.kind === 'INVALID'
        ? {
            result: {
              sessionId: attempt.sessionId,
              nonce: attempt.nonce,
              ok: false,
              error: 'INVALID_MESSAGE',
            },
          }
        : await this.recordAttempt.execute(attempt.message);
    try {
      await this.device.publishResult(parsed.deviceCode, reply.result);
    } catch (error) {
      this.logger.error(
        `Result for session ${reply.result.sessionId} was not published: ${describe(error)}`,
      );
    }
    if (reply.end !== undefined) {
      try {
        await this.device.publishEnd(parsed.deviceCode, reply.end);
      } catch (error) {
        this.logger.error(
          `End for session ${reply.end.sessionId} was not published: ${describe(error)}`,
        );
      }
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
