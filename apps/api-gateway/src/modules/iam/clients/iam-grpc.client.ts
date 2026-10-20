import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import {
  INTERNAL_GRPC_AUTH_METADATA_KEY,
  mapGrpcErrorToHttpException,
} from '@app/common';
import type {
  AccessPrincipalResponse,
  AuthenticateGoogleRequest,
  AuthorizationDecisionResponse,
  AuthSessionResponse,
  ChangePasswordRequest,
  CheckPermissionsRequest,
  CompleteGoogleLinkRequest,
  CompleteGoogleLinkResponse,
  ConfirmGoogleLinkRequest,
  StartGoogleLinkRequest,
  StartGoogleLinkResponse,
  UnlinkGoogleAccountRequest,
  CheckRolesRequest,
  ConfirmRegistrationRequest,
  ForgotPasswordResponse,
  GetCurrentUserRequest,
  UpdateMyProfileRequest,
  GetMyAuthorizationRequest,
  GetUserAuthorizationResponse,
  RequestGuestIdentityVerificationRequest,
  RequestGuestIdentityVerificationResponse,
  ConfirmGuestIdentityVerificationRequest,
  ConfirmGuestIdentityVerificationResponse,
  GetMyCustomerIdentityRequest,
  GetMyCustomerIdentityResponse,
  LinkGuestIdentityToMyAccountRequest,
  LinkGuestIdentityToMyAccountResponse,
  AssignUserRoleRequest,
  AssignUserRoleResponse,
  GetUserAuthorizationRequest,
  GrantRolePermissionRequest,
  RevokeRolePermissionRequest,
  RolePermissionGrantResponse,
  GetUserByIdRequest,
  ListPermissionsResponse,
  ListRolePermissionsRequest,
  ListRolePermissionsResponse,
  ListRolesResponse,
  ListUserRolesRequest,
  ListUserRolesResponse,
  ListUserSecurityAuditEventsRequest,
  ListUserSecurityAuditEventsResponse,
  ListUsersRequest,
  ListUsersResponse,
  LoginRequest,
  ProvisionUserRequest,
  ProvisionUserResponse,
  RevokeUserRoleRequest,
  RevokeUserRoleResponse,
  UpdateUserStatusRequest,
  UpdateUserStatusResponse,
  LogoutAllRequest,
  LogoutRequest,
  RefreshTokenRequest,
  RegisterChallengeResponse,
  RegisterRequest,
  ResendVerificationEmailRequest,
  ResendVerificationEmailResponse,
  ResetPasswordRequest,
  UserResponse,
} from '@app/contracts';
import { createOutgoingGrpcMetadata } from '@app/logger';
import type { Metadata } from '@grpc/grpc-js';
import { Observable, firstValueFrom, timeout } from 'rxjs';

export const IAM_GRPC_CLIENT = 'IAM_GRPC_CLIENT';
const IAM_RPC_TIMEOUT_MS = 5000;

interface IamServiceClient {
  register(
    request: RegisterRequest,
    metadata?: Metadata,
  ): Observable<RegisterChallengeResponse>;
  confirmRegistration(
    request: ConfirmRegistrationRequest,
    metadata?: Metadata,
  ): Observable<AuthSessionResponse>;
  login(
    request: LoginRequest,
    metadata?: Metadata,
  ): Observable<AuthSessionResponse>;
  authenticateGoogle(
    request: AuthenticateGoogleRequest,
    metadata?: Metadata,
  ): Observable<AuthSessionResponse>;
  refreshToken(
    request: RefreshTokenRequest,
    metadata?: Metadata,
  ): Observable<AuthSessionResponse>;
  logout(request: LogoutRequest, metadata?: Metadata): Observable<object>;
  logoutAll(request: LogoutAllRequest, metadata?: Metadata): Observable<object>;
  resendVerificationEmail(
    request: ResendVerificationEmailRequest,
    metadata?: Metadata,
  ): Observable<ResendVerificationEmailResponse>;
  forgotPassword(
    request: { email: string },
    metadata?: Metadata,
  ): Observable<ForgotPasswordResponse>;
  resetPassword(
    request: ResetPasswordRequest,
    metadata?: Metadata,
  ): Observable<object>;
  changePassword(
    request: ChangePasswordRequest,
    metadata?: Metadata,
  ): Observable<object>;
  startGoogleLink(
    request: StartGoogleLinkRequest,
    metadata?: Metadata,
  ): Observable<StartGoogleLinkResponse>;
  completeGoogleLink(
    request: CompleteGoogleLinkRequest,
    metadata?: Metadata,
  ): Observable<CompleteGoogleLinkResponse>;
  confirmGoogleLink(
    request: ConfirmGoogleLinkRequest,
    metadata?: Metadata,
  ): Observable<UserResponse>;
  unlinkGoogleAccount(
    request: UnlinkGoogleAccountRequest,
    metadata?: Metadata,
  ): Observable<UserResponse>;
  getCurrentUser(
    request: GetCurrentUserRequest,
    metadata?: Metadata,
  ): Observable<UserResponse>;
  updateMyProfile(
    request: UpdateMyProfileRequest,
    metadata?: Metadata,
  ): Observable<UserResponse>;
  getMyAuthorization(
    request: GetMyAuthorizationRequest,
    metadata?: Metadata,
  ): Observable<GetUserAuthorizationResponse>;
  requestGuestIdentityVerification(
    request: RequestGuestIdentityVerificationRequest,
    metadata?: Metadata,
  ): Observable<RequestGuestIdentityVerificationResponse>;
  confirmGuestIdentityVerification(
    request: ConfirmGuestIdentityVerificationRequest,
    metadata?: Metadata,
  ): Observable<ConfirmGuestIdentityVerificationResponse>;
  getMyCustomerIdentity(
    request: GetMyCustomerIdentityRequest,
    metadata?: Metadata,
  ): Observable<GetMyCustomerIdentityResponse>;
  linkGuestIdentityToMyAccount(
    request: LinkGuestIdentityToMyAccountRequest,
    metadata?: Metadata,
  ): Observable<LinkGuestIdentityToMyAccountResponse>;
  getUserById(
    request: GetUserByIdRequest,
    metadata?: Metadata,
  ): Observable<UserResponse>;
  listUsers(
    request: ListUsersRequest,
    metadata?: Metadata,
  ): Observable<ListUsersResponse>;
  updateUserStatus(
    request: UpdateUserStatusRequest,
    metadata?: Metadata,
  ): Observable<UpdateUserStatusResponse>;
  provisionUser(
    request: ProvisionUserRequest,
    metadata?: Metadata,
  ): Observable<ProvisionUserResponse>;
  listRoles(
    request: Record<string, never>,
    metadata?: Metadata,
  ): Observable<ListRolesResponse>;
  listPermissions(
    request: Record<string, never>,
    metadata?: Metadata,
  ): Observable<ListPermissionsResponse>;
  listUserRoles(
    request: ListUserRolesRequest,
    metadata?: Metadata,
  ): Observable<ListUserRolesResponse>;
  assignUserRole(
    request: AssignUserRoleRequest,
    metadata?: Metadata,
  ): Observable<AssignUserRoleResponse>;
  revokeUserRole(
    request: RevokeUserRoleRequest,
    metadata?: Metadata,
  ): Observable<RevokeUserRoleResponse>;
  getUserAuthorization(
    request: GetUserAuthorizationRequest,
    metadata?: Metadata,
  ): Observable<GetUserAuthorizationResponse>;
  listRolePermissions(
    request: ListRolePermissionsRequest,
    metadata?: Metadata,
  ): Observable<ListRolePermissionsResponse>;
  grantRolePermission(
    request: GrantRolePermissionRequest,
    metadata?: Metadata,
  ): Observable<RolePermissionGrantResponse>;
  revokeRolePermission(
    request: RevokeRolePermissionRequest,
    metadata?: Metadata,
  ): Observable<RolePermissionGrantResponse>;
  listUserSecurityAuditEvents(
    request: ListUserSecurityAuditEventsRequest,
    metadata?: Metadata,
  ): Observable<ListUserSecurityAuditEventsResponse>;
  validateAccessToken(
    request: { accessCredential: string },
    metadata?: Metadata,
  ): Observable<AccessPrincipalResponse>;
  checkRoles(
    request: CheckRolesRequest,
    metadata?: Metadata,
  ): Observable<AuthorizationDecisionResponse>;
  checkPermissions(
    request: CheckPermissionsRequest,
    metadata?: Metadata,
  ): Observable<AuthorizationDecisionResponse>;
}

@Injectable()
export class IamGrpcClient implements OnModuleInit {
  private iamService!: IamServiceClient;
  private readonly internalSecret: string;

  constructor(
    @Inject(IAM_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
    configService: ConfigService,
  ) {
    this.internalSecret = configService.getOrThrow<string>(
      'apiGateway.internalGrpcSecret',
    );
  }

  onModuleInit(): void {
    this.iamService =
      this.grpcClient.getService<IamServiceClient>('IamService');
  }

  register(request: RegisterRequest): Promise<RegisterChallengeResponse> {
    return this.unary((metadata) =>
      this.iamService.register(request, metadata),
    );
  }

  confirmRegistration(
    email: string,
    otp: string,
  ): Promise<AuthSessionResponse> {
    return this.unary((metadata) =>
      this.iamService.confirmRegistration({ email, otp }, metadata),
    );
  }

  login(request: LoginRequest): Promise<AuthSessionResponse> {
    return this.unary((metadata) => this.iamService.login(request, metadata));
  }

  authenticateGoogle(idToken: string): Promise<AuthSessionResponse> {
    return this.unary((metadata) =>
      this.iamService.authenticateGoogle({ idToken }, metadata),
    );
  }

  refreshToken(refreshCredential: string): Promise<AuthSessionResponse> {
    return this.unary((metadata) =>
      this.iamService.refreshToken({ refreshCredential }, metadata),
    );
  }

  logout(refreshCredential: string): Promise<void> {
    return this.unary((metadata) =>
      this.iamService.logout({ refreshCredential }, metadata),
    ).then(() => undefined);
  }

  logoutAll(accessCredential: string): Promise<void> {
    return this.unary((metadata) =>
      this.iamService.logoutAll({ accessCredential }, metadata),
    ).then(() => undefined);
  }

  resendVerificationEmail(
    email: string,
  ): Promise<ResendVerificationEmailResponse> {
    return this.unary((metadata) =>
      this.iamService.resendVerificationEmail({ email }, metadata),
    );
  }

  forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    return this.unary((metadata) =>
      this.iamService.forgotPassword({ email }, metadata),
    );
  }

  resetPassword(recoveryCredential: string, password: string): Promise<void> {
    return this.unary((metadata) =>
      this.iamService.resetPassword({ recoveryCredential, password }, metadata),
    ).then(() => undefined);
  }

  startGoogleLink(
    accessCredential: string,
    password: string,
  ): Promise<StartGoogleLinkResponse> {
    return this.unary((metadata) =>
      this.iamService.startGoogleLink({ accessCredential, password }, metadata),
    );
  }

  completeGoogleLink(
    intentId: string,
    idToken: string,
  ): Promise<CompleteGoogleLinkResponse> {
    return this.unary((metadata) =>
      this.iamService.completeGoogleLink({ intentId, idToken }, metadata),
    );
  }

  confirmGoogleLink(
    accessCredential: string,
    confirmationId: string,
  ): Promise<UserResponse> {
    return this.unary((metadata) =>
      this.iamService.confirmGoogleLink(
        { accessCredential, confirmationId },
        metadata,
      ),
    );
  }

  unlinkGoogleAccount(
    accessCredential: string,
    password: string,
  ): Promise<UserResponse> {
    return this.unary((metadata) =>
      this.iamService.unlinkGoogleAccount(
        { accessCredential, password },
        metadata,
      ),
    );
  }

  changePassword(
    accessCredential: string,
    currentPassword: string,
    password: string,
  ): Promise<void> {
    return this.unary((metadata) =>
      this.iamService.changePassword(
        { accessCredential, currentPassword, password },
        metadata,
      ),
    ).then(() => undefined);
  }

  getCurrentUser(accessCredential: string): Promise<UserResponse> {
    return this.unary((metadata) =>
      this.iamService.getCurrentUser({ accessCredential }, metadata),
    );
  }

  updateMyProfile(
    accessCredential: string,
    patch: { fullName?: string; phone?: string; clearPhone: boolean },
  ): Promise<UserResponse> {
    return this.unary((metadata) =>
      this.iamService.updateMyProfile(
        {
          accessCredential,
          clearPhone: patch.clearPhone,
          ...(patch.fullName === undefined ? {} : { fullName: patch.fullName }),
          ...(patch.phone === undefined ? {} : { phone: patch.phone }),
        },
        metadata,
      ),
    );
  }

  getMyAuthorization(
    accessCredential: string,
  ): Promise<GetUserAuthorizationResponse> {
    return this.unary((metadata) =>
      this.iamService.getMyAuthorization({ accessCredential }, metadata),
    );
  }

  requestGuestIdentityVerification(
    contactEmail: string,
    clientIp: string,
  ): Promise<RequestGuestIdentityVerificationResponse> {
    return this.unary((metadata) =>
      this.iamService.requestGuestIdentityVerification(
        { contactEmail, clientIp },
        metadata,
      ),
    );
  }

  confirmGuestIdentityVerification(
    challengeId: string,
    otp: string,
  ): Promise<ConfirmGuestIdentityVerificationResponse> {
    return this.unary((metadata) =>
      this.iamService.confirmGuestIdentityVerification(
        { challengeId, otp },
        metadata,
      ),
    );
  }

  getMyCustomerIdentity(
    accessCredential: string,
  ): Promise<GetMyCustomerIdentityResponse> {
    return this.unary((metadata) =>
      this.iamService.getMyCustomerIdentity({ accessCredential }, metadata),
    );
  }

  linkGuestIdentityToMyAccount(
    accessCredential: string,
    guestProof: string,
  ): Promise<LinkGuestIdentityToMyAccountResponse> {
    return this.unary((metadata) =>
      this.iamService.linkGuestIdentityToMyAccount(
        { accessCredential, guestProof },
        metadata,
      ),
    );
  }

  getUserById(userId: string): Promise<UserResponse> {
    return this.unary((metadata) =>
      this.iamService.getUserById({ userId }, metadata),
    );
  }

  listUsers(request: ListUsersRequest): Promise<ListUsersResponse> {
    return this.unary((metadata) =>
      this.iamService.listUsers(request, metadata),
    );
  }

  updateUserStatus(
    request: UpdateUserStatusRequest,
  ): Promise<UpdateUserStatusResponse> {
    return this.unary((metadata) =>
      this.iamService.updateUserStatus(request, metadata),
    );
  }

  provisionUser(request: ProvisionUserRequest): Promise<ProvisionUserResponse> {
    return this.unary((metadata) =>
      this.iamService.provisionUser(request, metadata),
    );
  }

  listRoles(): Promise<ListRolesResponse> {
    return this.unary((metadata) => this.iamService.listRoles({}, metadata));
  }

  listPermissions(): Promise<ListPermissionsResponse> {
    return this.unary((metadata) =>
      this.iamService.listPermissions({}, metadata),
    );
  }

  listUserRoles(userId: string): Promise<ListUserRolesResponse> {
    return this.unary((metadata) =>
      this.iamService.listUserRoles({ userId }, metadata),
    );
  }

  assignUserRole(
    request: AssignUserRoleRequest,
  ): Promise<AssignUserRoleResponse> {
    return this.unary((metadata) =>
      this.iamService.assignUserRole(request, metadata),
    );
  }

  revokeUserRole(
    request: RevokeUserRoleRequest,
  ): Promise<RevokeUserRoleResponse> {
    return this.unary((metadata) =>
      this.iamService.revokeUserRole(request, metadata),
    );
  }

  getUserAuthorization(userId: string): Promise<GetUserAuthorizationResponse> {
    return this.unary((metadata) =>
      this.iamService.getUserAuthorization({ userId }, metadata),
    );
  }

  listRolePermissions(roleCode: string): Promise<ListRolePermissionsResponse> {
    return this.unary((metadata) =>
      this.iamService.listRolePermissions({ roleCode }, metadata),
    );
  }

  grantRolePermission(
    request: GrantRolePermissionRequest,
  ): Promise<RolePermissionGrantResponse> {
    return this.unary((metadata) =>
      this.iamService.grantRolePermission(request, metadata),
    );
  }

  revokeRolePermission(
    request: RevokeRolePermissionRequest,
  ): Promise<RolePermissionGrantResponse> {
    return this.unary((metadata) =>
      this.iamService.revokeRolePermission(request, metadata),
    );
  }

  listUserSecurityAuditEvents(
    request: ListUserSecurityAuditEventsRequest,
  ): Promise<ListUserSecurityAuditEventsResponse> {
    return this.unary((metadata) =>
      this.iamService.listUserSecurityAuditEvents(request, metadata),
    );
  }

  validateAccessToken(
    accessCredential: string,
  ): Promise<AccessPrincipalResponse> {
    return this.unary((metadata) =>
      this.iamService.validateAccessToken({ accessCredential }, metadata),
    );
  }

  checkRoles(
    accessCredential: string,
    roleCodes: string[],
  ): Promise<AuthorizationDecisionResponse> {
    return this.unary((metadata) =>
      this.iamService.checkRoles({ accessCredential, roleCodes }, metadata),
    );
  }

  checkPermissions(
    accessCredential: string,
    permissionCodes: string[],
  ): Promise<AuthorizationDecisionResponse> {
    return this.unary((metadata) =>
      this.iamService.checkPermissions(
        { accessCredential, permissionCodes },
        metadata,
      ),
    );
  }

  private async unary<T>(
    call: (metadata: Metadata) => Observable<T>,
  ): Promise<T> {
    const metadata = this.createInternalMetadata();
    try {
      return await firstValueFrom(
        call(metadata).pipe(timeout(IAM_RPC_TIMEOUT_MS)),
      );
    } catch (error: unknown) {
      throw mapGrpcErrorToHttpException(error);
    }
  }

  private createInternalMetadata(): Metadata {
    const metadata = createOutgoingGrpcMetadata();
    metadata.set(INTERNAL_GRPC_AUTH_METADATA_KEY, this.internalSecret);
    return metadata;
  }
}
