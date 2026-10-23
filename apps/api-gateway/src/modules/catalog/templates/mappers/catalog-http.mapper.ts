import type {
  GetConfigurationOptionsResponse,
  GetTemplate3DAssetsResponse,
  RingTemplateDetailMessage,
  RingTemplateSummaryMessage,
} from '@app/contracts';
import type { ConfigurationOptionsResponseDto } from '../dto/response/configuration-options.response.dto';
import type { RingTemplateDetailResponseDto } from '../dto/response/ring-template-detail.response.dto';
import type { RingTemplateSummaryResponseDto } from '../dto/response/ring-template-summary.response.dto';
import type { Template3DAssetsResponseDto } from '../dto/response/template-3d-assets.response.dto';

export function toRingTemplateSummaryResponse(
  message: RingTemplateSummaryMessage,
): RingTemplateSummaryResponseDto {
  return {
    id: message.id,
    code: message.code,
    name: message.name,
    description: message.description,
    glb_asset_key: message.glbAssetKey,
    stone_layout: message.stoneLayout,
    design_supported_personalization_packages: [
      ...message.designSupportedPersonalizationPackages,
    ],
    status: message.status,
  };
}

export function toRingTemplateDetailResponse(
  message: RingTemplateDetailMessage,
): RingTemplateDetailResponseDto {
  return {
    ...toRingTemplateSummaryResponse(message),
    theta_min_deg: message.thetaMinDeg,
    theta_max_deg: message.thetaMaxDeg,
    v_min_mm: message.vMinMm,
    v_max_mm: message.vMaxMm,
    boundary_json: parseJsonSafely(message.boundaryJson),
    forbidden_zones_json: parseJsonSafely(message.forbiddenZonesJson),
    placement_tolerance_mm: message.placementToleranceMm,
  };
}

export function toConfigurationOptionsResponse(
  message: GetConfigurationOptionsResponse,
): ConfigurationOptionsResponseDto {
  return {
    variants: message.variants.map((v) => ({
      id: v.id,
      material_id: v.materialId,
      standard_size: v.standardSize,
      local_wall_thickness_mm: v.localWallThicknessMm,
      max_safe_engraving_depth_mm: v.maxSafeEngravingDepthMm,
      status: v.status,
    })),
    materials: message.materials.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      material_family: m.materialFamily,
      purity_percent: m.purityPercent,
      color: m.color,
    })),
    gemstone_groups: message.gemstoneGroups.map((g) => ({
      id: g.id,
      code: g.code,
      name: g.name,
      selection_mode: g.selectionMode,
      is_required: g.isRequired,
      sequence_no: g.sequenceNo,
      slots: g.slots.map((s) => ({
        id: s.id,
        slot_index: s.slotIndex,
        code: s.code,
        glb_node_name: s.glbNodeName,
      })),
    })),
    compatible_gemstones: message.compatibleGemstones.map((gem) => ({
      id: gem.id,
      code: gem.code,
      name: gem.name,
      stone_type: gem.stoneType,
      shape: gem.shape,
      length_mm: gem.lengthMm,
      width_mm: gem.widthMm,
      color_grade: gem.colorGrade,
      clarity_grade: gem.clarityGrade,
      certified_required: gem.certifiedRequired,
      compatible_group_ids: [...gem.compatibleGroupIds],
    })),
  };
}

export function toTemplate3DAssetsResponse(
  message: GetTemplate3DAssetsResponse,
): Template3DAssetsResponseDto {
  return {
    template_id: message.templateId,
    glb_asset_key: message.glbAssetKey,
    engrave_surface: message.engraveSurface
      ? {
          theta_min_deg: message.engraveSurface.thetaMinDeg,
          theta_max_deg: message.engraveSurface.thetaMaxDeg,
          v_min_mm: message.engraveSurface.vMinMm,
          v_max_mm: message.engraveSurface.vMaxMm,
          boundary_json: parseJsonSafely(message.engraveSurface.boundaryJson),
          forbidden_zones_json: parseJsonSafely(
            message.engraveSurface.forbiddenZonesJson,
          ),
          placement_tolerance_mm: message.engraveSurface.placementToleranceMm,
        }
      : undefined,
    slot_anchors: message.slotAnchors.map((s) => ({
      slot_id: s.slotId,
      group_id: s.groupId,
      slot_index: s.slotIndex,
      slot_code: s.slotCode,
      glb_node_name: s.glbNodeName,
    })),
  };
}

function parseJsonSafely(raw?: string): unknown {
  if (raw === undefined || raw === null || raw.trim() === '') {
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}


