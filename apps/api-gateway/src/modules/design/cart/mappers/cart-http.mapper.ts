import type {
  AddCartItemRequest,
  UpdateCartItemRequest,
  ValidateCheckoutRequest,
  VerifiedActor,
} from '@app/contracts';
import type {
  AddCartItemBodyDto,
  UpdateCartItemBodyDto,
  ValidateCheckoutBodyDto,
} from '../dto';

export function toAddCartItemGrpcRequest(
  actor: VerifiedActor,
  body: AddCartItemBodyDto,
): AddCartItemRequest {
  return {
    actor,
    templateVariantId: body.templateVariantId,
    targetSize: body.targetSize,
    gemstoneSelections: body.gemstoneSelections.map((sel) => ({
      slotNumber: sel.slotNumber,
      gemstoneOptionId: sel.gemstoneOptionId,
    })),
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
