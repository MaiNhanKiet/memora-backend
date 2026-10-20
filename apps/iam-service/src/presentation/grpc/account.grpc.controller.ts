import {
  BadRequestException,
  Controller,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  GetCurrentUserRequest,
  GetMyAuthorizationRequest,
  GetUserAuthorizationResponse,
  GetUserByIdRequest,
  UpdateMyProfileRequest,
  UserResponse,
} from '@app/contracts';
import { AuthenticationService } from '../../application/auth/authentication.service';
import { UsersService } from '../../application/users/users.service';
import { requireCredential, requireUserId } from './grpc-request';
import { InternalGrpcAuthGuard } from './internal-grpc-auth.guard';
import { toPublicUserMessage } from './mappers/user.grpc.mapper';

@Controller()
@UseGuards(InternalGrpcAuthGuard)
export class AccountGrpcController {
  constructor(
    private readonly authentication: AuthenticationService,
    private readonly users: UsersService,
  ) {}

  @GrpcMethod('IamService', 'GetCurrentUser')
  async getCurrentUser(request: GetCurrentUserRequest): Promise<UserResponse> {
    const principal = await this.authentication.verifyAccessToken(
      requireCredential(request.accessCredential),
    );
    return { user: toPublicUserMessage(principal.user) };
  }

  @GrpcMethod('IamService', 'UpdateMyProfile')
  async updateMyProfile(
    request: UpdateMyProfileRequest,
  ): Promise<UserResponse> {
    if (
      request.clearPhone &&
      request.phone !== undefined &&
      request.phone.trim() !== ''
    ) {
      throw new BadRequestException('phone is invalid');
    }
    const principal = await this.authentication.verifyAccessToken(
      requireCredential(request.accessCredential),
    );
    const user = await this.users.updateOwnProfile(principal.user.id, {
      ...(request.fullName === undefined ? {} : { fullName: request.fullName }),
      ...(request.clearPhone
        ? { phone: null }
        : request.phone === undefined
          ? {}
          : { phone: request.phone }),
    });
    return { user: toPublicUserMessage(user) };
  }

  @GrpcMethod('IamService', 'GetMyAuthorization')
  async getMyAuthorization(
    request: GetMyAuthorizationRequest,
  ): Promise<GetUserAuthorizationResponse> {
    const principal = await this.authentication.verifyAccessToken(
      requireCredential(request.accessCredential),
    );
    return {
      userId: principal.user.id,
      status: principal.user.status,
      roleCodes: sortedUnique(principal.authorization.roleCodes),
      permissionCodes: sortedUnique(principal.authorization.permissionCodes),
    };
  }

  @GrpcMethod('IamService', 'GetUserById')
  async getUserById(request: GetUserByIdRequest): Promise<UserResponse> {
    const user = await this.users.findById(requireUserId(request.userId));
    if (user === null) {
      throw new NotFoundException('User not found');
    }
    return { user: toPublicUserMessage(user) };
  }
}

function sortedUnique(codes: readonly string[]): string[] {
  return [...new Set(codes)].sort((left, right) => left.localeCompare(right));
}
