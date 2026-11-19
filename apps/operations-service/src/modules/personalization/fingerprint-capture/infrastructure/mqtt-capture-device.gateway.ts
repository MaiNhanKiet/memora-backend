import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { connect, type MqttClient } from 'mqtt';
import {
  CAPTURE_SUBSCRIPTIONS,
  commandsTopic,
  resultsTopic,
} from '../application/capture-topics';
import type {
  CaptureDeviceGateway,
  CaptureMessageHandler,
  CaptureMessageSource,
  DeviceResult,
  EndCommand,
  NextCommand,
  StartCommand,
} from '../application/capture-device.gateway';

export interface MqttSettings {
  readonly url: string;
  readonly username: string;
  readonly password: string;
}

/** Stable id + clean=false: the broker queues QoS 1 messages while Operations restarts. */
export const MQTT_CLIENT_ID = 'memora-operations';

/**
 * Talks to the Mosquitto broker with the `mqtt` package directly, so payloads are plain
 * JSON (Nest's MQTT transport would wrap them in {pattern,data}). Logs never contain
 * payloads, images or credentials. When `settings` is undefined (development) MQTT is
 * disabled: publishes are skipped and no connection is made.
 */
@Injectable()
export class MqttCaptureDeviceGateway
  implements CaptureDeviceGateway, CaptureMessageSource, OnModuleDestroy
{
  private readonly logger = new Logger(MqttCaptureDeviceGateway.name);
  private client: MqttClient | undefined;

  constructor(private readonly settings: MqttSettings | undefined) {}

  /** Connects once. The handler is registered before the first message can arrive. */
  start(handler: CaptureMessageHandler): void {
    if (this.settings === undefined) {
      this.logger.warn(
        'OPERATIONS_MQTT_* is not set: MQTT is disabled, capture devices receive no commands',
      );
      return;
    }
    if (this.client !== undefined) {
      return;
    }
    const client = connect(this.settings.url, {
      clientId: MQTT_CLIENT_ID,
      clean: false,
      username: this.settings.username,
      password: this.settings.password,
      keepalive: 30,
      connectTimeout: 10_000,
      reconnectPeriod: 5_000,
    });
    this.client = client;

    client.on('connect', () => {
      this.logger.log('Connected to the MQTT broker');
      // Re-subscribing on every (re)connect is idempotent and survives a lost session.
      client.subscribe([...CAPTURE_SUBSCRIPTIONS], { qos: 1 }, (error) => {
        if (error !== null && error !== undefined) {
          this.logger.error(`MQTT subscribe failed: ${error.message}`);
        }
      });
    });
    client.on('reconnect', () => this.logger.warn('Reconnecting to MQTT'));
    client.on('offline', () => this.logger.warn('MQTT client is offline'));
    client.on('error', (error) =>
      this.logger.error(`MQTT error: ${error.message}`),
    );
    client.on('message', (topic, payload) => {
      handler(topic, payload).catch((error: unknown) => {
        this.logger.error(
          `MQTT message on ${topic} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      });
    });
  }

  publishStart(deviceCode: string, command: StartCommand): Promise<void> {
    return this.publish(commandsTopic(deviceCode), command);
  }

  publishResult(deviceCode: string, result: DeviceResult): Promise<void> {
    return this.publish(resultsTopic(deviceCode), result);
  }

  publishEnd(deviceCode: string, command: EndCommand): Promise<void> {
    return this.publish(commandsTopic(deviceCode), command);
  }

  publishNext(deviceCode: string, command: NextCommand): Promise<void> {
    return this.publish(commandsTopic(deviceCode), command);
  }

  async onModuleDestroy(): Promise<void> {
    const client = this.client;
    this.client = undefined;
    if (client !== undefined) {
      await client.endAsync();
    }
  }

  private async publish(topic: string, body: object): Promise<void> {
    if (this.settings === undefined) {
      this.logger.debug(`MQTT disabled: not publishing to ${topic}`);
      return;
    }
    if (this.client === undefined) {
      throw new Error('MQTT client is not started');
    }
    await this.client.publishAsync(topic, JSON.stringify(body), {
      qos: 1,
      retain: false,
    });
  }
}
