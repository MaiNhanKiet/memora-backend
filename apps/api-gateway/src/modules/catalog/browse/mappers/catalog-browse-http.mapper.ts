import type {
  GetResizePoliciesRequest,
  GetTemplate3DAssetsRequest,
  GetTemplateByIdRequest,
  GetTemplateConfigurationOptionsRequest,
  ListGemstoneOptionsRequest,
  ListGemstoneSlotsRequest,
  ListMaterialsRequest,
  ListTemplatesRequest,
  ListTemplateVariantsRequest,
  ValidateConfigurationRequest,
} from '@app/contracts';
import type {
  ListGemstoneOptionsQueryDto,
  ListTemplatesQueryDto,
  ListVariantsQueryDto,
  ValidateConfigurationBodyDto,
} from '../dto';

export function toListTemplatesGrpcRequest(
  query: ListTemplatesQueryDto,
): ListTemplatesRequest {
  return {
    pagination: {
      page: query.page,
      limit: query.limit,
    },
    gender: query.gender,
    search: query.search,
  };
}

export function toGetTemplateByIdGrpcRequest(
  templateId: string,
): GetTemplateByIdRequest {
  return { templateId };
}

export function toGetTemplateConfigurationOptionsGrpcRequest(
  templateId: string,
): GetTemplateConfigurationOptionsRequest {
  return { templateId };
}

export function toGetTemplate3DAssetsGrpcRequest(
  templateId: string,
): GetTemplate3DAssetsRequest {
  return { templateId };
}

export function toListMaterialsGrpcRequest(
  status = 'ACTIVE',
): ListMaterialsRequest {
  return { status };
}

export function toListTemplateVariantsGrpcRequest(
  templateId: string,
  query: ListVariantsQueryDto,
): ListTemplateVariantsRequest {
  return {
    templateId,
    materialId: query.materialId,
  };
}

export function toListGemstoneOptionsGrpcRequest(
  query: ListGemstoneOptionsQueryDto,
): ListGemstoneOptionsRequest {
  return {
    pagination: {
      page: query.page,
      limit: query.limit,
    },
    stoneType: query.stoneType,
    shape: query.shape,
    isCertified: query.isCertified,
  };
}

export function toGetGemstoneSlotsGrpcRequest(
  templateId: string,
): ListGemstoneSlotsRequest {
  return { templateId };
}

export function toValidateConfigurationGrpcRequest(
  body: ValidateConfigurationBodyDto,
): ValidateConfigurationRequest {
  return {
    templateId: body.templateId,
    materialId: body.materialId,
    standardSize: body.standardSize,
    targetSize: body.targetSize,
    gemstoneSelections: body.gemstoneSelections.map((sel) => ({
      slotNumber: sel.slotNumber,
      gemstoneOptionId: sel.gemstoneOptionId,
    })),
    personalizationPackage: body.personalizationPackage ?? 'NONE',
  };
}

export function toGetResizePoliciesGrpcRequest(
  templateVariantId?: string,
  templateId?: string,
): GetResizePoliciesRequest {
  return {
    templateVariantId,
    templateId,
  };
}
