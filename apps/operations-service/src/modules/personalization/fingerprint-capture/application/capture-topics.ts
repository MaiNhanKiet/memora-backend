/** MQTT topic layout of PERSO-007. The device code always comes from the topic. */
export const CAPTURE_TOPIC_PREFIX = 'memora/capture';

export const CAPTURE_SUBSCRIPTIONS = [
  `${CAPTURE_TOPIC_PREFIX}/+/attempts`,
  `${CAPTURE_TOPIC_PREFIX}/+/hello`,
] as const;

export function commandsTopic(deviceCode: string): string {
  return `${CAPTURE_TOPIC_PREFIX}/${deviceCode}/commands`;
}

export function resultsTopic(deviceCode: string): string {
  return `${CAPTURE_TOPIC_PREFIX}/${deviceCode}/results`;
}
