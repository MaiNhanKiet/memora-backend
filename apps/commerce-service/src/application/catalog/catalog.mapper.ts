import type {
  GemstoneGroup,
  GemstoneOption,
  GemstoneSlot,
  Material,
  RingTemplate,
  TemplateCompatibility,
  TemplateVariant,
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
  entity: RingTemplate,
): RingTemplateSummaryRecord {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
    description: entity.description ?? undefined,
    glbAssetKey: entity.glbAssetKey,
    stoneLayout: entity.stoneLayout,
    designSupportedPersonalizationPackages: [
      ...entity.designSupportedPersonalizationPackages,
    ],
    status: entity.status,
  };
}

export function toRingTemplateDetailRecord(
  entity: RingTemplate,
): RingTemplateDetailRecord {
  return {
    ...toRingTemplateSummaryRecord(entity),
    thetaMinDeg:
      entity.thetaMinDeg !== null && entity.thetaMinDeg !== undefined
        ? Number(entity.thetaMinDeg)
        : undefined,
    thetaMaxDeg:
      entity.thetaMaxDeg !== null && entity.thetaMaxDeg !== undefined
        ? Number(entity.thetaMaxDeg)
        : undefined,
    vMinMm:
      entity.vMinMm !== null && entity.vMinMm !== undefined
        ? Number(entity.vMinMm)
        : undefined,
    vMaxMm:
      entity.vMaxMm !== null && entity.vMaxMm !== undefined
        ? Number(entity.vMaxMm)
        : undefined,
    boundaryJson:
      entity.boundaryJson !== null && entity.boundaryJson !== undefined
        ? JSON.stringify(entity.boundaryJson)
        : undefined,
    forbiddenZonesJson:
      entity.forbiddenZonesJson !== null &&
      entity.forbiddenZonesJson !== undefined
        ? JSON.stringify(entity.forbiddenZonesJson)
        : undefined,
    placementToleranceMm:
      entity.placementToleranceMm !== null &&
      entity.placementToleranceMm !== undefined
        ? Number(entity.placementToleranceMm)
        : undefined,
  };
}

export function toConfigurationOptionsRecord(data: {
  variants: (TemplateVariant & { material: Material })[];
  gemstoneGroups: (GemstoneGroup & { slots: GemstoneSlot[] })[];
  compatibilities: (TemplateCompatibility & {
    gemstoneOption: GemstoneOption;
  })[];
}): ConfigurationOptionsRecord {
  const variantRecords: TemplateVariantOptionRecord[] = data.variants.map(
    (v) => ({
      id: v.id,
      materialId: v.materialId,
      standardSize: Number(v.standardSize),
      localWallThicknessMm: Number(v.localWallThicknessMm),
      maxSafeEngravingDepthMm: Number(v.maxSafeEngravingDepthMm),
      status: v.status,
    }),
  );

  const materialsMap = new Map<string, MaterialOptionRecord>();
  for (const v of data.variants) {
    if (!materialsMap.has(v.material.id)) {
      materialsMap.set(v.material.id, {
        id: v.material.id,
        code: v.material.code,
        name: v.material.name,
        materialFamily: v.material.materialFamily ?? undefined,
        purityPercent:
          v.material.purityPercent !== null
            ? Number(v.material.purityPercent)
            : undefined,
        color: v.material.color ?? undefined,
      });
    }
  }

  const groupRecords: GemstoneGroupOptionRecord[] = data.gemstoneGroups.map(
    (g) => ({
      id: g.id,
      code: g.code,
      name: g.name ?? undefined,
      selectionMode: g.selectionMode,
      isRequired: g.isRequired,
      sequenceNo: g.sequenceNo,
      slots: g.slots.map((s) => ({
        id: s.id,
        slotIndex: s.slotIndex,
        code: s.name ?? `SLOT_${s.slotIndex}`,
        glbNodeName: s.meshNodeName ?? '',
      })),
    }),
  );

  const gemstoneOptionsMap = new Map<
    string,
    { option: GemstoneOption; groupIds: Set<string> }
  >();

  for (const c of data.compatibilities) {
    const existing = gemstoneOptionsMap.get(c.gemstoneOption.id);
    if (existing !== undefined) {
      existing.groupIds.add(c.gemstoneGroupId);
    } else {
      gemstoneOptionsMap.set(c.gemstoneOption.id, {
        option: c.gemstoneOption,
        groupIds: new Set([c.gemstoneGroupId]),
      });
    }
  }

  const compatibleGemstones: GemstoneOptionItemRecord[] = Array.from(
    gemstoneOptionsMap.values(),
  ).map(({ option, groupIds }) => ({
    id: option.id,
    code: option.code,
    name: option.name,
    stoneType: option.stoneType,
    shape: option.shape,
    lengthMm: Number(option.lengthMm),
    widthMm: Number(option.widthMm),
    colorGrade: option.colorGrade ?? undefined,
    clarityGrade: option.clarityGrade ?? undefined,
    certifiedRequired: option.certifiedRequired,
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
  template: RingTemplate & {
    gemstoneGroups: (GemstoneGroup & { slots: GemstoneSlot[] })[];
  },
): Template3DAssetsRecord {
  const slotAnchors: TemplateSlotAnchorRecord[] = [];
  for (const group of template.gemstoneGroups) {
    for (const slot of group.slots) {
      slotAnchors.push({
        slotId: slot.id,
        groupId: group.id,
        slotIndex: slot.slotIndex,
        slotCode: slot.name ?? `SLOT_${slot.slotIndex}`,
        glbNodeName: slot.meshNodeName ?? '',
      });
    }
  }

  const hasEngraveSurface =
    template.thetaMinDeg !== null ||
    template.thetaMaxDeg !== null ||
    template.vMinMm !== null ||
    template.vMaxMm !== null ||
    template.boundaryJson !== null;

  return {
    templateId: template.id,
    glbAssetKey: template.glbAssetKey,
    engraveSurface: hasEngraveSurface
      ? {
          thetaMinDeg:
            template.thetaMinDeg !== null
              ? Number(template.thetaMinDeg)
              : undefined,
          thetaMaxDeg:
            template.thetaMaxDeg !== null
              ? Number(template.thetaMaxDeg)
              : undefined,
          vMinMm:
            template.vMinMm !== null ? Number(template.vMinMm) : undefined,
          vMaxMm:
            template.vMaxMm !== null ? Number(template.vMaxMm) : undefined,
          boundaryJson:
            template.boundaryJson !== null
              ? JSON.stringify(template.boundaryJson)
              : undefined,
          forbiddenZonesJson:
            template.forbiddenZonesJson !== null
              ? JSON.stringify(template.forbiddenZonesJson)
              : undefined,
          placementToleranceMm:
            template.placementToleranceMm !== null
              ? Number(template.placementToleranceMm)
              : undefined,
        }
      : undefined,
    slotAnchors,
  };
}

