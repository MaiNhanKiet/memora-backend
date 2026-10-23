import type {
  GetConfigurationOptionsResponse,
  GetTemplate3DAssetsResponse,
  RingTemplateDetailMessage,
  RingTemplateSummaryMessage,
} from '@app/contracts';
import type {
  ConfigurationOptionsRecord,
  RingTemplateDetailRecord,
  RingTemplateSummaryRecord,
  Template3DAssetsRecord,
} from '../../../application/catalog/catalog.mapper';

export function toRingTemplateSummaryMessage(
  record: RingTemplateSummaryRecord,
): RingTemplateSummaryMessage {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    glbAssetKey: record.glbAssetKey,
    stoneLayout: record.stoneLayout,
    designSupportedPersonalizationPackages: [
      ...record.designSupportedPersonalizationPackages,
    ],
    status: record.status,
  };
}

export function toRingTemplateDetailMessage(
  record: RingTemplateDetailRecord,
): RingTemplateDetailMessage {
  return {
    ...toRingTemplateSummaryMessage(record),
    thetaMinDeg: record.thetaMinDeg,
    thetaMaxDeg: record.thetaMaxDeg,
    vMinMm: record.vMinMm,
    vMaxMm: record.vMaxMm,
    boundaryJson: record.boundaryJson,
    forbiddenZonesJson: record.forbiddenZonesJson,
    placementToleranceMm: record.placementToleranceMm,
  };
}

export function toConfigurationOptionsResponse(
  record: ConfigurationOptionsRecord,
): GetConfigurationOptionsResponse {
  return {
    variants: record.variants.map((v) => ({
      id: v.id,
      materialId: v.materialId,
      standardSize: v.standardSize,
      localWallThicknessMm: v.localWallThicknessMm,
      maxSafeEngravingDepthMm: v.maxSafeEngravingDepthMm,
      status: v.status,
    })),
    materials: record.materials.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      materialFamily: m.materialFamily,
      purityPercent: m.purityPercent,
      color: m.color,
    })),
    gemstoneGroups: record.gemstoneGroups.map((g) => ({
      id: g.id,
      code: g.code,
      name: g.name,
      selectionMode: g.selectionMode,
      isRequired: g.isRequired,
      sequenceNo: g.sequenceNo,
      slots: g.slots.map((s) => ({
        id: s.id,
        slotIndex: s.slotIndex,
        code: s.code,
        glbNodeName: s.glbNodeName,
      })),
    })),
    compatibleGemstones: record.compatibleGemstones.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      stoneType: c.stoneType,
      shape: c.shape,
      lengthMm: c.lengthMm,
      widthMm: c.widthMm,
      colorGrade: c.colorGrade,
      clarityGrade: c.clarityGrade,
      certifiedRequired: c.certifiedRequired,
      compatibleGroupIds: [...c.compatibleGroupIds],
    })),
  };
}

export function toGetTemplate3DAssetsResponse(
  record: Template3DAssetsRecord,
): GetTemplate3DAssetsResponse {
  return {
    templateId: record.templateId,
    glbAssetKey: record.glbAssetKey,
    engraveSurface: record.engraveSurface
      ? {
          thetaMinDeg: record.engraveSurface.thetaMinDeg,
          thetaMaxDeg: record.engraveSurface.thetaMaxDeg,
          vMinMm: record.engraveSurface.vMinMm,
          vMaxMm: record.engraveSurface.vMaxMm,
          boundaryJson: record.engraveSurface.boundaryJson,
          forbiddenZonesJson: record.engraveSurface.forbiddenZonesJson,
          placementToleranceMm: record.engraveSurface.placementToleranceMm,
        }
      : undefined,
    slotAnchors: record.slotAnchors.map((s) => ({
      slotId: s.slotId,
      groupId: s.groupId,
      slotIndex: s.slotIndex,
      slotCode: s.slotCode,
      glbNodeName: s.glbNodeName,
    })),
  };
}

