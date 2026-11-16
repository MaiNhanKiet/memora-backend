import type {
  ArchiveTemplateRequest,
  CreateTemplateRequest,
  PublishTemplateRequest,
  UpdateTemplateRequest,
} from '@app/contracts';
import type {
  CreateTemplateBodyDto,
  UpdateTemplateBodyDto,
} from '../dto';

export function toCreateTemplateGrpcRequest(
  body: CreateTemplateBodyDto,
  createdByUserId?: string,
): CreateTemplateRequest {
  return {
    code: body.code,
    name: body.name,
    description: body.description,
    glbAssetKey: body.glbAssetKey,
    stoneLayout: body.stoneLayout,
    designSupportedPersonalizationPackages:
      body.designSupportedPersonalizationPackages,
    gender: body.gender,
    createdByUserId,
  };
}

export function toUpdateTemplateGrpcRequest(
  templateId: string,
  body: UpdateTemplateBodyDto,
): UpdateTemplateRequest {
  return {
    templateId,
    name: body.name,
    description: body.description,
    glbAssetKey: body.glbAssetKey,
    stoneLayout: body.stoneLayout,
    designSupportedPersonalizationPackages:
      body.designSupportedPersonalizationPackages,
    gender: body.gender,
  };
}

export function toPublishTemplateGrpcRequest(
  templateId: string,
): PublishTemplateRequest {
  return { templateId };
}

export function toArchiveTemplateGrpcRequest(
  templateId: string,
): ArchiveTemplateRequest {
  return { templateId };
}
