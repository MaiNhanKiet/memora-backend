import type {
  gemstone_groups,
  gemstone_options,
  gemstone_slots,
  materials,
  ring_templates,
  template_compatibilities,
  template_variants,
} from '../../../generated/prisma/client';

export interface RingTemplateSummaryRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly glbAssetKey: string;
  readonly stoneLayout: string;
  readonly designSupportedPersonalizationPackages: string[];
  readonly status: string;
}

export interface RingTemplateDetailRecord extends RingTemplateSummaryRecord {
  readonly thetaMinDeg?: number;
  readonly thetaMaxDeg?: number;
  readonly vMinMm?: number;
  readonly vMaxMm?: number;
  readonly boundaryJson?: string;
  readonly forbiddenZonesJson?: string;
  readonly placementToleranceMm?: number;
}

export interface TemplateVariantOptionRecord {
  readonly id: string;
  readonly materialId: string;
  readonly standardSize: number;
  readonly localWallThicknessMm: number;
  readonly maxSafeEngravingDepthMm: number;
  readonly status: string;
}

export interface MaterialOptionRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly materialFamily?: string;
  readonly purityPercent?: number;
  readonly color?: string;
}

export interface GemstoneSlotOptionRecord {
  readonly id: string;
  readonly slotIndex: number;
  readonly code: string;
  readonly glbNodeName: string;
}

export interface GemstoneGroupOptionRecord {
  readonly id: string;
  readonly code: string;
  readonly name?: string;
  readonly selectionMode: string;
  readonly isRequired: boolean;
  readonly sequenceNo: number;
  readonly slots: GemstoneSlotOptionRecord[];
}

export interface GemstoneOptionItemRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly stoneType: string;
  readonly shape: string;
  readonly lengthMm: number;
  readonly widthMm: number;
  readonly colorGrade?: string;
  readonly clarityGrade?: string;
  readonly certifiedRequired: boolean;
  readonly compatibleGroupIds: string[];
}

export interface ConfigurationOptionsRecord {
  readonly variants: TemplateVariantOptionRecord[];
  readonly materials: MaterialOptionRecord[];
  readonly gemstoneGroups: GemstoneGroupOptionRecord[];
  readonly compatibleGemstones: GemstoneOptionItemRecord[];
}

export interface TemplateSlotAnchorRecord {
  readonly slotId: string;
  readonly groupId: string;
  readonly slotIndex: number;
  readonly slotCode: string;
  readonly glbNodeName: string;
}

export interface TemplateEngraveSurfaceRecord {
  readonly thetaMinDeg?: number;
  readonly thetaMaxDeg?: number;
  readonly vMinMm?: number;
  readonly vMaxMm?: number;
  readonly boundaryJson?: string;
  readonly forbiddenZonesJson?: string;
  readonly placementToleranceMm?: number;
}

export interface Template3DAssetsRecord {
  readonly templateId: string;
  readonly glbAssetKey: string;
  readonly engraveSurface?: TemplateEngraveSurfaceRecord;
  readonly slotAnchors: TemplateSlotAnchorRecord[];
}


export function toRingTemplateSummaryRecord(
  entity: ring_templates,
): RingTemplateSummaryRecord {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
    description: entity.description ?? undefined,
    glbAssetKey: entity.glb_asset_key,
    stoneLayout: entity.stone_layout,
    designSupportedPersonalizationPackages: [
      ...entity.design_supported_personalization_packages,
    ],
    status: entity.status,
  };
}

export function toRingTemplateDetailRecord(
  entity: ring_templates,
): RingTemplateDetailRecord {
  return {
    ...toRingTemplateSummaryRecord(entity),
    thetaMinDeg:
      entity.theta_min_deg !== null && entity.theta_min_deg !== undefined
        ? Number(entity.theta_min_deg)
        : undefined,
    thetaMaxDeg:
      entity.theta_max_deg !== null && entity.theta_max_deg !== undefined
        ? Number(entity.theta_max_deg)
        : undefined,
    vMinMm:
      entity.v_min_mm !== null && entity.v_min_mm !== undefined
        ? Number(entity.v_min_mm)
        : undefined,
    vMaxMm:
      entity.v_max_mm !== null && entity.v_max_mm !== undefined
        ? Number(entity.v_max_mm)
        : undefined,
    boundaryJson:
      entity.boundary_json !== null && entity.boundary_json !== undefined
        ? JSON.stringify(entity.boundary_json)
        : undefined,
    forbiddenZonesJson:
      entity.forbidden_zones_json !== null &&
      entity.forbidden_zones_json !== undefined
        ? JSON.stringify(entity.forbidden_zones_json)
        : undefined,
    placementToleranceMm:
      entity.placement_tolerance_mm !== null &&
      entity.placement_tolerance_mm !== undefined
        ? Number(entity.placement_tolerance_mm)
        : undefined,
  };
}

export function toConfigurationOptionsRecord(data: {
  template_variants: (template_variants & { materials: materials })[];
  gemstone_groups: (gemstone_groups & { gemstone_slots: gemstone_slots[] })[];
  compatibilities: (template_compatibilities & {
    gemstone_options: gemstone_options;
  })[];
}): ConfigurationOptionsRecord {
  const variantRecords: TemplateVariantOptionRecord[] =
    data.template_variants.map((v) => ({
      id: v.id,
      materialId: v.material_id,
      standardSize: Number(v.standard_size),
      localWallThicknessMm: Number(v.local_wall_thickness_mm),
      maxSafeEngravingDepthMm: Number(v.max_safe_engraving_depth_mm),
      status: v.status,
    }));

  const materialsMap = new Map<string, MaterialOptionRecord>();
  for (const v of data.template_variants) {
    if (!materialsMap.has(v.materials.id)) {
      materialsMap.set(v.materials.id, {
        id: v.materials.id,
        code: v.materials.code,
        name: v.materials.name,
        materialFamily: v.materials.material_family ?? undefined,
        purityPercent:
          v.materials.purity_percent !== null
            ? Number(v.materials.purity_percent)
            : undefined,
        color: v.materials.color ?? undefined,
      });
    }
  }

  const groupRecords: GemstoneGroupOptionRecord[] = data.gemstone_groups.map(
    (g) => ({
      id: g.id,
      code: g.code,
      name: g.name ?? undefined,
      selectionMode: g.selection_mode,
      isRequired: g.is_required,
      sequenceNo: g.sequence_no,
      slots: g.gemstone_slots.map((s) => ({
        id: s.id,
        slotIndex: s.slot_index,
        code: s.code,
        glbNodeName: s.glb_node_name,
      })),
    }),
  );

  const gemstoneOptionsMap = new Map<
    string,
    { option: gemstone_options; groupIds: Set<string> }
  >();

  for (const c of data.compatibilities) {
    const existing = gemstoneOptionsMap.get(c.gemstone_options.id);
    if (existing !== undefined) {
      existing.groupIds.add(c.gemstone_group_id);
    } else {
      gemstoneOptionsMap.set(c.gemstone_options.id, {
        option: c.gemstone_options,
        groupIds: new Set([c.gemstone_group_id]),
      });
    }
  }

  const compatibleGemstones: GemstoneOptionItemRecord[] = Array.from(
    gemstoneOptionsMap.values(),
  ).map(({ option, groupIds }) => ({
    id: option.id,
    code: option.code,
    name: option.name,
    stoneType: option.stone_type,
    shape: option.shape,
    lengthMm: Number(option.length_mm),
    widthMm: Number(option.width_mm),
    colorGrade: option.color_grade ?? undefined,
    clarityGrade: option.clarity_grade ?? undefined,
    certifiedRequired: option.certified_required,
    compatibleGroupIds: Array.from(groupIds),
  }));

  return {
    variants: variantRecords,
    materials: Array.from(materialsMap.values()),
    gemstoneGroups: groupRecords,
    compatibleGemstones,
  };
}

export function toTemplate3DAssetsRecord(
  template: ring_templates & {
    gemstone_groups: (gemstone_groups & { gemstone_slots: gemstone_slots[] })[];
  },
): Template3DAssetsRecord {
  const slotAnchors: TemplateSlotAnchorRecord[] = [];
  for (const group of template.gemstone_groups) {
    for (const slot of group.gemstone_slots) {
      slotAnchors.push({
        slotId: slot.id,
        groupId: group.id,
        slotIndex: slot.slot_index,
        slotCode: slot.code,
        glbNodeName: slot.glb_node_name,
      });
    }
  }

  const hasEngraveSurface =
    template.theta_min_deg !== null ||
    template.theta_max_deg !== null ||
    template.v_min_mm !== null ||
    template.v_max_mm !== null ||
    template.boundary_json !== null;

  return {
    templateId: template.id,
    glbAssetKey: template.glb_asset_key,
    engraveSurface: hasEngraveSurface
      ? {
          thetaMinDeg:
            template.theta_min_deg !== null
              ? Number(template.theta_min_deg)
              : undefined,
          thetaMaxDeg:
            template.theta_max_deg !== null
              ? Number(template.theta_max_deg)
              : undefined,
          vMinMm:
            template.v_min_mm !== null ? Number(template.v_min_mm) : undefined,
          vMaxMm:
            template.v_max_mm !== null ? Number(template.v_max_mm) : undefined,
          boundaryJson:
            template.boundary_json !== null
              ? JSON.stringify(template.boundary_json)
              : undefined,
          forbiddenZonesJson:
            template.forbidden_zones_json !== null
              ? JSON.stringify(template.forbidden_zones_json)
              : undefined,
          placementToleranceMm:
            template.placement_tolerance_mm !== null
              ? Number(template.placement_tolerance_mm)
              : undefined,
        }
      : undefined,
    slotAnchors,
  };
}


