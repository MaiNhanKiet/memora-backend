import type {
  AddCartItemRequest,
  GemstoneSelectionItem,
  UpdateCartItemRequest,
  ValidateCheckoutRequest,
  VerifiedActor,
} from '@app/contracts';
import type {
  AddCartItemBodyDto,
  GemstoneSelectionDto,
  UpdateCartItemBodyDto,
  ValidateCheckoutBodyDto,
} from '../dto';

function toGemstoneSelection({
  slotNumber,
  gemstoneOptionId,
  certifiedGemstoneId,
}: GemstoneSelectionDto): GemstoneSelectionItem {
  return { slotNumber, gemstoneOptionId, certifiedGemstoneId };
}

export function toAddCartItemGrpcRequest(
  actor: VerifiedActor,
  body: AddCartItemBodyDto,
): AddCartItemRequest {
  return {
    actor,
    templateVariantId: body.templateVariantId,
    targetSize: body.targetSize,
    gemstoneSelections: body.gemstoneSelections.map(toGemstoneSelection),
    personalizationPackage: body.personalizationPackage ?? 'NONE',
    memoryEnabled: body.memoryEnabled ?? false,
    maintenancePlan: body.maintenancePlan,
  };
}

export function toUpdateCartItemGrpcRequest(
  actor: VerifiedActor,
  draftId: string,
  body: UpdateCartItemBodyDto,
): UpdateCartItemRequest {
  return {
    actor,
    draftId,
    gemstoneSelectionUpdate: body.gemstoneSelections
      ? { items: body.gemstoneSelections.map(toGemstoneSelection) }
      : undefined,
    targetSize: body.targetSize,
    personalizationPackage: body.personalizationPackage,
    memoryEnabled: body.memoryEnabled,
    maintenancePlan: body.maintenancePlan,
  };
}

export function toValidateCheckoutGrpcRequest(
  actor: VerifiedActor,
  body: ValidateCheckoutBodyDto,
): ValidateCheckoutRequest {
  return {
    actor,
    selectedDraftIds: body.selectedDraftIds,
  };
}
