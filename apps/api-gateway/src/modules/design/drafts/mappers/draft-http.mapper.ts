import type {
  CreateDesignShareLinkRequest,
  CreateDesignShareLinkResponse,
  DuplicateDesignDraftRequest,
  GetDesignDraftRequest,
  RevokeDesignShareLinkRequest,
  RevokeDesignShareLinkResponse,
  VerifiedActor,
} from '@app/contracts';
import type {
  CreateDesignShareLinkBodyDto,
  CreateDesignShareLinkResponseDto,
  RevokeDesignShareLinkResponseDto,
} from '../dto';

export function toGetDesignDraftGrpcRequest(
  actor: VerifiedActor,
  draftId: string,
): GetDesignDraftRequest {
  return {
    draftId,
    actor,
  };
}

export function toDuplicateDesignDraftGrpcRequest(
  actor: VerifiedActor,
  draftId: string,
): DuplicateDesignDraftRequest {
  return {
    draftId,
    actor,
  };
}

export function toCreateDesignShareLinkGrpcRequest(
  actor: VerifiedActor,
  draftId: string,
  body: CreateDesignShareLinkBodyDto,
): CreateDesignShareLinkRequest {
  return {
    draftId,
    expiresInDays: body.expiresInDays,
    actor,
  };
}

export function toCreateDesignShareLinkResponseDto(
  res: CreateDesignShareLinkResponse,
): CreateDesignShareLinkResponseDto {
  return {
    linkId: res.linkId,
    code: res.code,
    shareUrl: res.shareUrl,
    status: res.status,
    expiresAt: res.expiresAt,
  };
}

export function toRevokeDesignShareLinkGrpcRequest(
  actor: VerifiedActor,
  draftId: string,
  linkId: string,
): RevokeDesignShareLinkRequest {
  return {
    draftId,
    linkId,
    actor,
  };
}

export function toRevokeDesignShareLinkResponseDto(
  res: RevokeDesignShareLinkResponse,
): RevokeDesignShareLinkResponseDto {
  return {
    success: res.success,
    message: res.message,
  };
}
