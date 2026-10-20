import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { IamGrpcClient } from '../../clients/iam-grpc.client';
import type { GatewayAuthenticatedPrincipal } from '../../auth/gateway-principal';
import { toPublicUserResponse } from '../../auth/mappers/auth-http.mapper';
import type { PublicUserResponseDto } from '../../auth/dto/response/public-user.response.dto';
import { UpdateMyProfileRequestDto } from '../dto/request/update-my-profile.request.dto';
import type { MyPermissionsResponseDto } from '../dto/response/my-permissions.response.dto';
import {
  ApiGetMeDocs,
  ApiGetMyPermissionsDocs,
  ApiPatchMeDocs,
} from '../docs/me.swagger';

@ApiTags('Me')
@Controller('me')
export class MeController {
  constructor(private readonly iam: IamGrpcClient) {}

  @Get('permissions')
  @ApiGetMyPermissionsDocs()
  async getMyPermissions(
    @CurrentUser() principal: GatewayAuthenticatedPrincipal | undefined,
  ): Promise<MyPermissionsResponseDto> {
    const credential = requireCredential(principal);
    return this.iam.getMyAuthorization(credential);
  }

  @Get()
  @ApiGetMeDocs()
  async getMe(
    @CurrentUser() principal: GatewayAuthenticatedPrincipal | undefined,
  ): Promise<PublicUserResponseDto> {
    const credential = requireCredential(principal);
    const result = await this.iam.getCurrentUser(credential);
    return toPublicUserResponse(result.user);
  }

  @Patch()
  @ApiPatchMeDocs()
  async updateMe(
    @CurrentUser() principal: GatewayAuthenticatedPrincipal | undefined,
    @Body() body: UpdateMyProfileRequestDto,
  ): Promise<PublicUserResponseDto> {
    if (body.fullName === undefined && body.phone === undefined) {
      throw new BadRequestException('At least one profile field is required');
    }
    const credential = requireCredential(principal);
    const result = await this.iam.updateMyProfile(credential, {
      clearPhone: body.phone === null,
      ...(body.fullName === undefined ? {} : { fullName: body.fullName }),
      ...(body.phone === undefined || body.phone === null
        ? {}
        : { phone: body.phone }),
    });
    return toPublicUserResponse(result.user);
  }
}

function requireCredential(
  principal: GatewayAuthenticatedPrincipal | undefined,
): string {
  if (principal === undefined) {
    throw new UnauthorizedException();
  }
  return principal.accessCredential;
}
