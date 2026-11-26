import type {
  AnchorNode,
  GemstoneOptionResponse,
  GemstoneSlotResponse,
  MaterialResponse,
  ResizePolicyItem,
  TemplateResponse,
  TemplateVariantResponse,
} from '@app/contracts';
import type {
  GemstoneOptionRecord,
  GemstoneSlotRecord,
  MaterialRecord,
  ResizePolicyVariantRecord,
  RingTemplateRecord,
  TemplateVariantRecord,
} from './catalog.repository';

export const CATALOG_CDN_BASE_URL = Symbol('CATALOG_CDN_BASE_URL');
export const DEFAULT_CATALOG_CDN_BASE_URL = 'https://cdn.memora.style';

export function resolveGlbUrl(
  key: string,
  cdnBaseUrl: string = DEFAULT_CATALOG_CDN_BASE_URL,
): string {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }
  const normalizedBase = (cdnBaseUrl || DEFAULT_CATALOG_CDN_BASE_URL).replace(
    /\/+$/,
    '',
  );
  const cleanKey = key.replace(/^\/+/, '');
  return `${normalizedBase}/${cleanKey}`;
}

export function toTemplateResponse(
  entity: RingTemplateRecord,
  cdnBaseUrl: string = DEFAULT_CATALOG_CDN_BASE_URL,
): TemplateResponse {
  return {
    id: entity.id,
    templateCode: entity.code,
    name: entity.name,
    description: entity.description ?? '',
    gender: 'UNISEX',
    engraveSurfaceType: 'INNER_FLAT',
    model3dAssetKey: entity.glbAssetKey,
    glbUrl: resolveGlbUrl(entity.glbAssetKey, cdnBaseUrl),
    mappingVersion: '1.0',
    defaultMaterialId: '',
    status: entity.status,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export function toMaterialResponse(entity: MaterialRecord): MaterialResponse {
  return {
    id: entity.id,
    materialCode: entity.code,
    name: entity.name,
    metalType: entity.materialFamily ?? 'GOLD',
    purityKarat: entity.purityPercent ?? 18,
    densityGCm3: 15.58,
    status: entity.status,
  };
}

export function toVariantResponse(
  entity: TemplateVariantRecord,
): TemplateVariantResponse {
  return {
    id: entity.id,
    ringTemplateId: entity.ringTemplateId,
    materialId: entity.materialId,
    standardSize: entity.standardSize,
    maxUpDelta: entity.maxUpDelta,
    maxDownDelta: entity.maxDownDelta,
    resizeMethod: entity.resizeMethod,
    addedMetalAllowed: entity.addedMetalAllowed,
    localWallThicknessMm: entity.localWallThicknessMm,
    minRemainingWallThicknessMm: entity.minRemainingWallThicknessMm,
    maxSafeEngravingDepthMm: entity.maxSafeEngravingDepthMm,
    status: entity.status,
  };
}

export function toGemstoneOptionResponse(
  entity: GemstoneOptionRecord,
): GemstoneOptionResponse {
  return {
    id: entity.id,
    stoneCode: entity.code,
    name: entity.name,
    stoneType: entity.stoneType,
    shape: entity.shape,
    color: entity.colorGrade ?? '',
    clarity: entity.clarityGrade ?? '',
    dimensionLengthMm: entity.lengthMm,
    dimensionWidthMm: entity.widthMm,
    isCertified: entity.certifiedRequired,
    status: entity.status,
  };
}

export function toGemstoneSlotResponse(
  entity: GemstoneSlotRecord,
  ringTemplateId = '',
): GemstoneSlotResponse {
  return {
    id: entity.id,
    ringTemplateId,
    slotNumber: entity.slotIndex,
    slotType: 'CENTER_STONE',
    gemstoneGroupId: entity.gemstoneGroupId,
    anchorNodeName: entity.glbNodeName,
    isRequired: entity.isRequired,
  };
}

export function toAnchorNodes(
  slots: readonly GemstoneSlotRecord[],
): AnchorNode[] {
  const anchors: AnchorNode[] = slots.map((slot) => ({
    nodeName: slot.glbNodeName,
    slotNumber: slot.slotIndex,
    slotType: 'CENTER_STONE',
  }));

  anchors.push({
    nodeName: 'Engrave_Inner_Plane',
    surfaceType: 'INNER_FLAT',
  });

  return anchors;
}

export function toResizePolicyItem(
  v: ResizePolicyVariantRecord,
): ResizePolicyItem {
  const up = v.maxUpDelta ?? 0;
  const down = v.maxDownDelta ?? 0;
  return {
    templateVariantId: v.id,
    templateId: v.ringTemplateId,
    templateName: v.templateName,
    materialName: v.materialName,
    standardSize: v.standardSize,
    minSize: v.standardSize - down,
    maxSize: v.standardSize + up,
    maxUpDelta: up,
    maxDownDelta: down,
    resizeMethod: v.resizeMethod ?? 'STRETCH_COMPRESS',
    addedMetalAllowed: v.addedMetalAllowed,
    localWallThicknessMm: v.localWallThicknessMm,
    minRemainingWallThicknessMm: v.minRemainingWallThicknessMm,
    maxSafeEngravingDepthMm: v.maxSafeEngravingDepthMm,
  };
}
