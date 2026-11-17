import type { EstimatePriceRequest } from '@app/contracts';
import type { EstimatePriceBodyDto } from '../dto';

export function toEstimatePriceGrpcRequest(
  body: EstimatePriceBodyDto,
): EstimatePriceRequest {
  return {
    templateVariantId: body.templateVariantId,
    targetSize: body.targetSize,
    gemstoneOptionIds: body.gemstoneOptionIds ?? [],
    personalizationPackage: body.personalizationPackage ?? 'NONE',
  };
}
