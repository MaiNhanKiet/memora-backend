import { Module } from '@nestjs/common';
import { PrismaModule } from '../persistence/prisma/prisma.module';
import { CustomerIdentityRepository } from './customer-identity.repository';
import { PermissionRepository } from './permission.repository';
import { RolePermissionRepository } from './role-permission.repository';
import { RoleRepository } from './role.repository';
import { UserRoleRepository } from './user-role.repository';
import { SecurityAuditRepository } from './security-audit.repository';
import { UserRepository } from './user.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    UserRepository,
    CustomerIdentityRepository,
    RoleRepository,
    PermissionRepository,
    UserRoleRepository,
    RolePermissionRepository,
    SecurityAuditRepository,
  ],
  exports: [
    PrismaModule,
    UserRepository,
    CustomerIdentityRepository,
    RoleRepository,
    PermissionRepository,
    UserRoleRepository,
    RolePermissionRepository,
    SecurityAuditRepository,
  ],
})
export class RepositoriesModule {}
