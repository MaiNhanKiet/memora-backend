import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/auth';
import { PERMISSIONS } from '@app/contracts';
import { IamGrpcClient } from '../../clients/iam-grpc.client';
import { ApiListPermissionsDocs } from '../docs/permission-management.swagger';
import type { PermissionCatalogItemResponseDto } from '../dto/response/permission-catalog.response.dto';

@ApiTags('IAM Permissions')
@Controller('admin/permissions')
export class PermissionManagementController {
  constructor(private readonly iam: IamGrpcClient) {}

  @Get()
  @RequirePermissions(PERMISSIONS.IAM_RBAC_MANAGE)
  @ApiListPermissionsDocs()
  async listPermissions(): Promise<PermissionCatalogItemResponseDto[]> {
    const result = await this.iam.listPermissions();
    return result.permissions;
  }
}
