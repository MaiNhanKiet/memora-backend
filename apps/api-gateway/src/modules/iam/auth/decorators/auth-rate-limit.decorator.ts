import { minutes, Throttle } from '@nestjs/throttler';

export function AuthRateLimit(limit: number, windowMinutes: number) {
  return Throttle({
    default: { limit, ttl: minutes(windowMinutes) },
  });
}
