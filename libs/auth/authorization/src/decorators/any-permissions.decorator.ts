import { SetMetadata } from '@nestjs/common';
import { AUTHORIZATION_METADATA } from '../constants/authorization.constants';

/**
 * Permissions — chỉ cần một permission khớp (OR).
 * Không gộp nhiều code vào một lần CheckPermissions (ALL).
 */
export const RequireAnyPermissions = (...permissions: string[]) =>
  SetMetadata(AUTHORIZATION_METADATA.PERMISSIONS_ANY, permissions);
