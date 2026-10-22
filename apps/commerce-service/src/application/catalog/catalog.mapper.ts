import type { RingTemplate } from '../../../generated/prisma/client';

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
