import type { RingTemplateSummaryMessage } from '@app/contracts';
import type { RingTemplateSummaryResponseDto } from '../dto/response/ring-template-summary.response.dto';

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
