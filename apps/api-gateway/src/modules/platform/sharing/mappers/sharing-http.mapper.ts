import type {
  CreateShareLinkRequest,
  CreateShareLinkResponse,
  ResolveShareLinkResponse,
  RevokeShareLinkResponse,
  VerifiedActor,
} from '@app/contracts';
import type {
  CreateShareLinkRequestDto,
  CreateShareLinkResponseDto,
  ResolvedShareLinkResponseDto,
  RevokeShareLinkResponseDto,
} from '../dto';

function parseJsonRecord(raw?: string): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function toResolveShareLinkResponseDto(
  res: ResolveShareLinkResponse,
): ResolvedShareLinkResponseDto {
  return {
    shareToken: res.shareToken,
    status: res.status,
    expiresAt: res.expiresAt || undefined,
    ringTemplateId: res.ringTemplateId || undefined,
    ringDesignDraftId: res.ringDesignDraftId || undefined,
    sanitizedSnapshot: parseJsonRecord(res.sanitizedSnapshotJson),
    createdAt: res.createdAt,
  };
}

export function toCreateShareLinkGrpcRequest(
  actor: VerifiedActor,
  body: CreateShareLinkRequestDto,
): CreateShareLinkRequest {
  return {
    actor,
    ringDesignDraftId: body.ringDesignDraftId,
    ringTemplateId: body.ringTemplateId,
    sanitizedSnapshotJson: JSON.stringify(body.sanitizedSnapshot ?? {}),
    expiresInDays: body.expiresInDays,
  };
}

export function toCreateShareLinkResponseDto(
  res: CreateShareLinkResponse,
): CreateShareLinkResponseDto {
  return {
    id: res.id,
    shareToken: res.shareToken,
    shareUrl: res.shareUrl,
    status: res.status,
    expiresAt: res.expiresAt,
  };
}

export function toRevokeShareLinkResponseDto(
  res: RevokeShareLinkResponse,
): RevokeShareLinkResponseDto {
  return {
    id: res.id,
    status: res.status,
    revokedAt: res.revokedAt,
  };
}
