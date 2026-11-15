import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { GatewayGuest } from '../grpc/gateway-guest';

interface HttpRequestWithGuest {
  guest?: GatewayGuest;
}

/**
 * Đọc khách vãng lai mà JwtAuthGuard đã gắn vào `request.guest` (route `@AllowGuest`).
 * Không đọc header, không gọi IAM. Chưa có guest thì trả về `undefined`.
 */
export const CurrentGuest = createParamDecorator(
  (_data: unknown, context: ExecutionContext): GatewayGuest | undefined =>
    context.switchToHttp().getRequest<HttpRequestWithGuest>().guest,
);
