import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { AUTHORIZATION_METADATA } from '@app/auth';
import { AUTH_METADATA } from '@app/common';

type ReflectTarget = Parameters<Reflector['get']>[1];

/** True khi route khai báo RBAC (`@Roles`, `@RequirePermissions`, any-permissions). */
export function hasRbacMetadata(
  reflector: Reflector,
  targets: readonly ReflectTarget[],
): boolean {
  return Object.values(AUTHORIZATION_METADATA).some(
    (key) =>
      reflector.getAllAndOverride<unknown>(key, [...targets]) !== undefined,
  );
}

/**
 * Fail closed: `@AllowGuest` không được kết hợp với metadata RBAC.
 * Chạy khi khởi động Gateway; JwtAuthGuard cũng kiểm tra lại khi chạy.
 */
@Injectable()
export class GuestRoutePolicyCheck implements OnModuleInit {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit(): void {
    const conflicts: string[] = [];
    for (const wrapper of this.discovery.getControllers()) {
      const controller = wrapper.metatype;
      if (typeof controller !== 'function') {
        continue;
      }
      const prototype = controller.prototype as Record<string, unknown>;
      for (const name of Object.getOwnPropertyNames(prototype)) {
        const handler = prototype[name];
        if (name === 'constructor' || typeof handler !== 'function') {
          continue;
        }
        const targets = [handler as ReflectTarget, controller];
        const guest = this.reflector.getAllAndOverride<unknown>(
          AUTH_METADATA.ALLOW_GUEST,
          targets,
        );
        if (guest !== undefined && hasRbacMetadata(this.reflector, targets)) {
          conflicts.push(`${controller.name}.${name}`);
        }
      }
    }
    if (conflicts.length > 0) {
      throw new Error(
        `@AllowGuest cannot be combined with RBAC metadata: ${conflicts.join(', ')}`,
      );
    }
  }
}
