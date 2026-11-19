import type {
  AdjustInventoryRequest,
  AllocateInventoryRequest,
  ConsumeInventoryRequest,
  HoldInventoryRequest,
  ListInventoryMovementsRequest,
  ReleaseInventoryRequest,
  ReserveInventoryRequest,
  VerifiedActor,
} from '@app/contracts';
import type {
  AdjustInventoryBodyDto,
  AllocateInventoryBodyDto,
  HoldInventoryBodyDto,
  ListInventoryMovementsQueryDto,
  ReleaseInventoryBodyDto,
} from '../dto';

export function toHoldInventoryGrpcRequest(
  actor: VerifiedActor,
  body: HoldInventoryBodyDto,
): HoldInventoryRequest {
  return {
    actor,
    ringItemId: body.ringItemId,
    stockLotId: body.stockLotId,
    certifiedGemstoneId: body.certifiedGemstoneId,
    quantity: body.quantity,
    ttlMinutes: body.ttlMinutes,
  };
}

export function toReserveInventoryGrpcRequest(
  actor: VerifiedActor,
  allocationId: string,
): ReserveInventoryRequest {
  return {
    actor,
    allocationId,
  };
}

export function toAllocateInventoryGrpcRequest(
  actor: VerifiedActor,
  allocationId: string,
  body: AllocateInventoryBodyDto,
): AllocateInventoryRequest {
  return {
    actor,
    allocationId,
    productionAttemptId: body.productionAttemptId,
  };
}

export function toConsumeInventoryGrpcRequest(
  actor: VerifiedActor,
  allocationId: string,
): ConsumeInventoryRequest {
  return {
    actor,
    allocationId,
  };
}

export function toReleaseInventoryGrpcRequest(
  actor: VerifiedActor,
  allocationId: string,
  body: ReleaseInventoryBodyDto,
): ReleaseInventoryRequest {
  return {
    actor,
    allocationId,
    reason: body.reason,
  };
}

export function toListInventoryMovementsGrpcRequest(
  query: ListInventoryMovementsQueryDto,
): ListInventoryMovementsRequest {
  return {
    stockLotId: query.stockLotId,
    certifiedGemstoneId: query.certifiedGemstoneId,
    movementType: query.movementType,
    limit: query.limit,
    offset: query.offset,
  };
}

export function toAdjustInventoryGrpcRequest(
  body: AdjustInventoryBodyDto,
  userId?: string,
): AdjustInventoryRequest {
  return {
    stockLotId: body.stockLotId,
    adjustedQuantity: body.adjustedQuantity,
    reason: body.reason,
    metadataJson: body.metadata ? JSON.stringify(body.metadata) : undefined,
    performedByUserId: userId,
  };
}
