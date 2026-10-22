import type { RingTemplateSummaryMessage } from '@app/contracts';
import type { RingTemplateSummaryRecord } from '../../../application/catalog/catalog.mapper';

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
