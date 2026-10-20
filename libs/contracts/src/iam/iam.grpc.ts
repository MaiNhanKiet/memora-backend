// Contract gRPC của IAM, khớp proto/iam/v1/iam.proto.
// RPC mới: thêm message trong proto, rồi thêm method vào IamServiceHandler.
// Phía Gateway khai báo stub Observable ngay trong grpc client, cùng chỗ gọi .pipe().

import type {
  GrpcPaginationRequest,
  PaginatedGrpcResult,
  PaginationMeta,
} from '../common/pagination';

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface RegisterChallengeResponse {
  expiresInSeconds: number;
}

export interface ConfirmRegistrationRequest {
  email: string;
  otp: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthenticateGoogleRequest {
  idToken: string;
}

export interface RefreshTokenRequest {
  refreshCredential: string;
}

export interface LogoutRequest {
  refreshCredential: string;
}

export interface LogoutAllRequest {
  accessCredential: string;
}

export type LogoutResponse = Record<string, never>;

export interface ResendVerificationEmailRequest {
  email: string;
}

export interface ResendVerificationEmailResponse {
  alreadyVerified: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  accepted: boolean;
}

export interface ResetPasswordRequest {
  recoveryCredential: string;
  password: string;
}

export type ResetPasswordResponse = Record<string, never>;

export interface ChangePasswordRequest {
  accessCredential: string;
  currentPassword: string;
  password: string;
}

export type ChangePasswordResponse = Record<string, never>;

export interface StartGoogleLinkRequest {
  accessCredential: string;
  password: string;
}

export interface StartGoogleLinkResponse {
  intentId: string;
}

export interface CompleteGoogleLinkRequest {
  intentId: string;
  idToken: string;
}

export interface CompleteGoogleLinkResponse {
  confirmationRequired: boolean;
  confirmationId: string;
  user?: PublicUserMessage;
}

export interface ConfirmGoogleLinkRequest {
  accessCredential: string;
  confirmationId: string;
}

export interface UnlinkGoogleAccountRequest {
  accessCredential: string;
  password: string;
}

export interface GetCurrentUserRequest {
  accessCredential: string;
}

export interface GetUserByIdRequest {
  userId: string;
}

export interface UserResponse {
  user: PublicUserMessage;
}

export interface ValidateAccessTokenRequest {
  accessCredential: string;
}

export interface AccessPrincipalResponse {
  userId: string;
  tokenId: string;
  emailVerified: boolean;
  customerIdentityId?: string;
}

export interface CheckRolesRequest {
  accessCredential: string;
  roleCodes: string[];
}

export interface CheckPermissionsRequest {
  accessCredential: string;
  permissionCodes: string[];
}

export interface AuthorizationDecisionResponse {
  allowed: boolean;
  userId: string;
}

export interface AuthSessionResponse {
  user: PublicUserMessage;
  accessCredential: string;
  refreshCredential: string;
  tokenType: string;
  expiresInSeconds: number;
  refreshExpiresInSeconds: number;
}

export interface PublicUserMessage {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  authProvider: string;
  status: string;
  emailVerifiedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersRequest {
  pagination: GrpcPaginationRequest;
  status?: string;
}

export interface ListUsersResponse {
  users: PublicUserMessage[];
  pagination: PaginationMeta;
}

export interface UpdateUserStatusRequest {
  userId: string;
  status: string;
  actorUserId: string;
}

export interface UpdateUserStatusResponse {
  userId: string;
  status: string;
}

export interface ProvisionUserRequest {
  email: string;
  fullName: string;
  roleCode: string;
  createdByUserId: string;
}

export interface ProvisionUserResponse {
  userId: string;
  email: string;
  status: string;
  roleCode: string;
  initialPassword: string;
}

export interface RoleCatalogItemMessage {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export type ListRolesRequest = Record<string, never>;

export interface ListRolesResponse {
  roles: RoleCatalogItemMessage[];
}

export interface PermissionCatalogItemMessage {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export type ListPermissionsRequest = Record<string, never>;

export interface ListPermissionsResponse {
  permissions: PermissionCatalogItemMessage[];
}

export interface UserRoleAssignmentItemMessage {
  assignmentId: string;
  roleCode: string;
  roleName: string;
  assignedAt: string;
}

export interface ListUserRolesRequest {
  userId: string;
}

export interface ListUserRolesResponse {
  assignments: UserRoleAssignmentItemMessage[];
}

export interface AssignUserRoleRequest {
  userId: string;
  roleCode: string;
  assignedByUserId: string;
}

export interface AssignUserRoleResponse {
  assignmentId: string;
  roleCode: string;
  assignedAt: string;
}

export interface RevokeUserRoleRequest {
  userId: string;
  roleCode: string;
  reason?: string;
  actorUserId: string;
}

export interface RevokeUserRoleResponse {
  assignmentId: string;
  roleCode: string;
  revokedAt: string;
}

export interface GetUserAuthorizationRequest {
  userId: string;
}

export interface GetUserAuthorizationResponse {
  userId: string;
  status: string;
  roleCodes: string[];
  permissionCodes: string[];
}

export interface ListRolePermissionsRequest {
  roleCode: string;
}

export interface ListRolePermissionsResponse {
  roleCode: string;
  permissionCodes: string[];
}

export interface GrantRolePermissionRequest {
  roleCode: string;
  permissionCode: string;
  grantedByUserId: string;
}

export interface RevokeRolePermissionRequest {
  roleCode: string;
  permissionCode: string;
}

export interface RolePermissionGrantResponse {
  roleCode: string;
  permissionCode: string;
}

export interface SecurityAuditEventItemMessage {
  id: string;
  action: string;
  outcome: string;
  createdAt: string;
  metadataJson: string;
}

export interface ListUserSecurityAuditEventsRequest {
  userId: string;
  pagination: GrpcPaginationRequest;
}

export interface ListUserSecurityAuditEventsResponse {
  events: SecurityAuditEventItemMessage[];
  pagination: PaginationMeta;
}

export type PaginatedPublicUsers = PaginatedGrpcResult<PublicUserMessage>;

export interface IamServiceHandler {
  register(request: RegisterRequest): Promise<RegisterChallengeResponse>;
  confirmRegistration(
    request: ConfirmRegistrationRequest,
  ): Promise<AuthSessionResponse>;
  login(request: LoginRequest): Promise<AuthSessionResponse>;
  authenticateGoogle(
    request: AuthenticateGoogleRequest,
  ): Promise<AuthSessionResponse>;
  refreshToken(request: RefreshTokenRequest): Promise<AuthSessionResponse>;
  logout(request: LogoutRequest): Promise<LogoutResponse>;
  logoutAll(request: LogoutAllRequest): Promise<LogoutResponse>;
  resendVerificationEmail(
    request: ResendVerificationEmailRequest,
  ): Promise<ResendVerificationEmailResponse>;
  forgotPassword(
    request: ForgotPasswordRequest,
  ): Promise<ForgotPasswordResponse>;
  resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResponse>;
  changePassword(
    request: ChangePasswordRequest,
  ): Promise<ChangePasswordResponse>;
  startGoogleLink(
    request: StartGoogleLinkRequest,
  ): Promise<StartGoogleLinkResponse>;
  completeGoogleLink(
    request: CompleteGoogleLinkRequest,
  ): Promise<CompleteGoogleLinkResponse>;
  confirmGoogleLink(request: ConfirmGoogleLinkRequest): Promise<UserResponse>;
  unlinkGoogleAccount(
    request: UnlinkGoogleAccountRequest,
  ): Promise<UserResponse>;
  getCurrentUser(request: GetCurrentUserRequest): Promise<UserResponse>;
  getUserById(request: GetUserByIdRequest): Promise<UserResponse>;
  listUsers(request: ListUsersRequest): Promise<ListUsersResponse>;
  updateUserStatus(
    request: UpdateUserStatusRequest,
  ): Promise<UpdateUserStatusResponse>;
  provisionUser(request: ProvisionUserRequest): Promise<ProvisionUserResponse>;
  listRoles(request: ListRolesRequest): Promise<ListRolesResponse>;
  listPermissions(
    request: ListPermissionsRequest,
  ): Promise<ListPermissionsResponse>;
  listUserRoles(request: ListUserRolesRequest): Promise<ListUserRolesResponse>;
  assignUserRole(
    request: AssignUserRoleRequest,
  ): Promise<AssignUserRoleResponse>;
  revokeUserRole(
    request: RevokeUserRoleRequest,
  ): Promise<RevokeUserRoleResponse>;
  getUserAuthorization(
    request: GetUserAuthorizationRequest,
  ): Promise<GetUserAuthorizationResponse>;
  listRolePermissions(
    request: ListRolePermissionsRequest,
  ): Promise<ListRolePermissionsResponse>;
  grantRolePermission(
    request: GrantRolePermissionRequest,
  ): Promise<RolePermissionGrantResponse>;
  revokeRolePermission(
    request: RevokeRolePermissionRequest,
  ): Promise<RolePermissionGrantResponse>;
  listUserSecurityAuditEvents(
    request: ListUserSecurityAuditEventsRequest,
  ): Promise<ListUserSecurityAuditEventsResponse>;
  validateAccessToken(
    request: ValidateAccessTokenRequest,
  ): Promise<AccessPrincipalResponse>;
  checkRoles(
    request: CheckRolesRequest,
  ): Promise<AuthorizationDecisionResponse>;
  checkPermissions(
    request: CheckPermissionsRequest,
  ): Promise<AuthorizationDecisionResponse>;
}
