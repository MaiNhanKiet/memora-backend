import type {
  CreateGemstoneOptionRequest,
  CreateMaterialRequest,
  CreateVariantRequest,
  UpdateCompatibilitiesRequest,
  UpdateMaterialRequest,
  UpdateResizePoliciesRequest,
  UpdateVariantRequest,
} from '@app/contracts';
import type {
  CreateGemstoneOptionBodyDto,
  CreateMaterialBodyDto,
  CreateVariantBodyDto,
  UpdateCompatibilitiesBodyDto,
  UpdateMaterialBodyDto,
  UpdateResizePoliciesBodyDto,
  UpdateVariantBodyDto,
} from '../dto';

export function toCreateMaterialGrpcRequest(
  body: CreateMaterialBodyDto,
): CreateMaterialRequest {
  return {
    code: body.code,
    name: body.name,
    materialFamily: body.materialFamily,
    purityPercent: body.purityPercent,
    color: body.color,
  };
}

export function toUpdateMaterialGrpcRequest(
  materialId: string,
  body: UpdateMaterialBodyDto,
): UpdateMaterialRequest {
  return {
    materialId,
    name: body.name,
    materialFamily: body.materialFamily,
    purityPercent: body.purityPercent,
    color: body.color,
    status: body.status,
  };
}

export function toCreateVariantGrpcRequest(
  body: CreateVariantBodyDto,
  createdByUserId?: string,
): CreateVariantRequest {
  return {
    ringTemplateId: body.ringTemplateId,
    materialId: body.materialId,
    standardSize: body.standardSize,
    maxUpDelta: body.maxUpDelta,
    maxDownDelta: body.maxDownDelta,
    resizeMethod: body.resizeMethod,
    addedMetalAllowed: body.addedMetalAllowed,
    localWallThicknessMm: body.localWallThicknessMm,
    minRemainingWallThicknessMm: body.minRemainingWallThicknessMm,
    maxSafeEngravingDepthMm: body.maxSafeEngravingDepthMm,
    createdByUserId,
  };
}

export function toUpdateVariantGrpcRequest(
  variantId: string,
  body: UpdateVariantBodyDto,
): UpdateVariantRequest {
  return {
    variantId,
    standardSize: body.standardSize,
    maxUpDelta: body.maxUpDelta,
    maxDownDelta: body.maxDownDelta,
    resizeMethod: body.resizeMethod,
    addedMetalAllowed: body.addedMetalAllowed,
    localWallThicknessMm: body.localWallThicknessMm,
    minRemainingWallThicknessMm: body.minRemainingWallThicknessMm,
    maxSafeEngravingDepthMm: body.maxSafeEngravingDepthMm,
    status: body.status,
  };
}

export function toCreateGemstoneOptionGrpcRequest(
  body: CreateGemstoneOptionBodyDto,
): CreateGemstoneOptionRequest {
  return {
    code: body.code,
    name: body.name,
    stoneType: body.stoneType,
    shape: body.shape,
    lengthMm: body.lengthMm,
    widthMm: body.widthMm,
    colorGrade: body.colorGrade,
    clarityGrade: body.clarityGrade,
    certifiedRequired: body.certifiedRequired,
  };
}

export function toUpdateCompatibilitiesGrpcRequest(
  body: UpdateCompatibilitiesBodyDto,
): UpdateCompatibilitiesRequest {
  return {
    templateVariantId: body.templateVariantId,
    gemstoneGroupId: body.gemstoneGroupId,
    gemstoneOptionIds: body.gemstoneOptionIds,
  };
}

export function toUpdateResizePoliciesGrpcRequest(
  templateVariantId: string,
  body: UpdateResizePoliciesBodyDto,
): UpdateResizePoliciesRequest {
  return {
    templateVariantId,
    maxUpDelta: body.maxUpDelta,
    maxDownDelta: body.maxDownDelta,
    resizeMethod: body.resizeMethod,
    addedMetalAllowed: body.addedMetalAllowed,
    minRemainingWallThicknessMm: body.minRemainingWallThicknessMm,
    maxSafeEngravingDepthMm: body.maxSafeEngravingDepthMm,
  };
}
