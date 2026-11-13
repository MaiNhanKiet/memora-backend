import { Injectable } from '@nestjs/common';
import type {
  gemstone_options,
  gemstone_slots,
  materials,
  ring_templates,
  template_variants,
} from '../../../generated/prisma/client';
import type {
  AnchorNode,
  GemstoneOptionResponse,
  GemstoneSlotResponse,
  MaterialResponse,
  TemplateResponse,
  TemplateVariantResponse,
} from '@app/contracts';

@Injectable()
export class CatalogMapper {
  private readonly cdnBaseUrl: string;

  constructor() {
    this.cdnBaseUrl = (
      process.env.CATALOG_CDN_BASE_URL ?? 'https://cdn.memora.style'
    ).replace(/\/+$/, '');
  }

  resolveGlbUrl(key: string): string {
    if (!key) return '';
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }
    const cleanKey = key.replace(/^\/+/, '');
    return `${this.cdnBaseUrl}/${cleanKey}`;
  }

  toTemplateResponse(entity: ring_templates): TemplateResponse {
    return {
      id: entity.id,
      templateCode: entity.code,
      name: entity.name,
      description: entity.description ?? '',
      gender: 'UNISEX', // standard fallback if not directly on entity
      engraveSurfaceType: 'INNER_FLAT',
      model3dAssetKey: entity.glb_asset_key,
      glbUrl: this.resolveGlbUrl(entity.glb_asset_key),
      mappingVersion: '1.0',
      defaultMaterialId: '',
      status: entity.status,
      createdAt: entity.created_at.toISOString(),
      updatedAt: entity.updated_at.toISOString(),
    };
  }

  toMaterialResponse(entity: materials): MaterialResponse {
    return {
      id: entity.id,
      materialCode: entity.code,
      name: entity.name,
      metalType: entity.material_family ?? 'GOLD',
      purityKarat: entity.purity_percent ? Number(entity.purity_percent) : 18,
      densityGCm3: 15.58, // standard jewellery gold density fallback
      status: entity.status,
    };
  }

  toVariantResponse(entity: template_variants): TemplateVariantResponse {
    return {
      id: entity.id,
      ringTemplateId: entity.ring_template_id,
      materialId: entity.material_id,
      standardSize: Number(entity.standard_size),
      maxUpDelta: entity.max_up_delta ? Number(entity.max_up_delta) : undefined,
      maxDownDelta: entity.max_down_delta
        ? Number(entity.max_down_delta)
        : undefined,
      resizeMethod: entity.resize_method ?? undefined,
      addedMetalAllowed: entity.added_metal_allowed,
      localWallThicknessMm: Number(entity.local_wall_thickness_mm),
      minRemainingWallThicknessMm: Number(
        entity.min_remaining_wall_thickness_mm,
      ),
      maxSafeEngravingDepthMm: Number(entity.max_safe_engraving_depth_mm),
      status: entity.status,
    };
  }

  toGemstoneOptionResponse(entity: gemstone_options): GemstoneOptionResponse {
    return {
      id: entity.id,
      stoneCode: entity.code,
      stoneType: entity.stone_type,
      shape: entity.shape,
      cutGrade: 'EXCELLENT',
      color: entity.color_grade ?? 'G',
      clarity: entity.clarity_grade ?? 'VS1',
      caratWeight: 0.5,
      dimensionLengthMm: Number(entity.length_mm),
      dimensionWidthMm: Number(entity.width_mm),
      dimensionHeightMm: 3.15,
      isCertified: entity.certified_required,
      status: entity.status,
    };
  }

  toGemstoneSlotResponse(
    entity: gemstone_slots & {
      gemstone_groups?: { is_required: boolean };
    },
  ): GemstoneSlotResponse {
    return {
      id: entity.id,
      ringTemplateId: '', // populated or left as logical reference
      slotNumber: entity.slot_index,
      slotType: 'CENTER_STONE',
      gemstoneGroupId: entity.gemstone_group_id,
      anchorNodeName: entity.glb_node_name,
      isRequired: entity.gemstone_groups?.is_required ?? false,
    };
  }

  toAnchorNodes(
    slots: (gemstone_slots & { gemstone_groups?: { is_required: boolean } })[],
  ): AnchorNode[] {
    const anchors: AnchorNode[] = slots.map((slot) => ({
      nodeName: slot.glb_node_name,
      slotNumber: slot.slot_index,
      slotType: 'CENTER_STONE',
    }));

    // Add standard engraving surface anchor
    anchors.push({
      nodeName: 'Engrave_Inner_Plane',
      surfaceType: 'INNER_FLAT',
    });

    return anchors;
  }
}
