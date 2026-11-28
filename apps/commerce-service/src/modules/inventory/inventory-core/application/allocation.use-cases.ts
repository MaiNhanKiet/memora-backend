import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseVerifiedActor, requireUserActor } from '@app/common';
import type {
  AllocateInventoryRequest,
  AllocationResponse,
  ConsumeInventoryRequest,
  HoldInventoryRequest,
  ReleaseInventoryRequest,
  ReserveInventoryRequest,
} from '@app/contracts';
import { toAllocationResponse } from './inventory.mapper';
import {
  INVENTORY_REPOSITORY,
  type InventoryRepository,
} from './inventory.repository';

function mapAllocationTransitionError(
  error: unknown,
  invalidStatusMessage: string,
): never {
  if (error instanceof Error) {
    if (error.message === 'ALLOCATION_NOT_FOUND') {
      throw new NotFoundException(error.message);
    }
    if (error.message === 'INVALID_ALLOCATION_STATUS') {
      throw new BadRequestException(invalidStatusMessage);
    }
  }
  throw error;
}

@Injectable()
export class HoldInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepository,
  ) {}

  async execute(request: HoldInventoryRequest): Promise<AllocationResponse> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));
    if (!request.stockLotId && !request.certifiedGemstoneId) {
      throw new BadRequestException(
        'Either stockLotId or certifiedGemstoneId must be provided',
      );
    }

    const quantity =
      request.quantity && request.quantity > 0 ? request.quantity : 1;
    const ttlMinutes =
      request.ttlMinutes && request.ttlMinutes > 0 ? request.ttlMinutes : 60;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    try {
      const created = await this.repository.holdInventory({
        ringItemId: request.ringItemId,
        stockLotId: request.stockLotId,
        certifiedGemstoneId: request.certifiedGemstoneId,
        quantity,
        expiresAt,
        allocatedByUserId: actor.userId,
      });

      return toAllocationResponse(created);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'INVALID_CERTIFIED_ALLOCATION') {
          throw new BadRequestException(
            'An exact gemstone requires quantity 1 and cannot use a stock lot',
          );
        }
        if (
          error.message === 'STOCK_LOT_NOT_FOUND' ||
          error.message === 'CERTIFIED_GEMSTONE_NOT_FOUND'
        ) {
          throw new NotFoundException(error.message);
        }
        if (
          error.message === 'STOCK_INSUFFICIENT' ||
          error.message === 'GEMSTONE_NOT_AVAILABLE'
        ) {
          throw new ConflictException(error.message);
        }
      }
      throw error;
    }
  }
}

@Injectable()
export class ReserveInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepository,
  ) {}

  async execute(request: ReserveInventoryRequest): Promise<AllocationResponse> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));

    try {
      const updated = await this.repository.reserveInventory({
        allocationId: request.allocationId,
        allocatedByUserId: actor.userId,
      });

      return toAllocationResponse(updated);
    } catch (error) {
      mapAllocationTransitionError(
        error,
        'Allocation can only be reserved from HOLD status',
      );
    }
  }
}

@Injectable()
export class AllocateInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepository,
  ) {}

  async execute(
    request: AllocateInventoryRequest,
  ): Promise<AllocationResponse> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));
    if (!request.productionAttemptId) {
      throw new BadRequestException('productionAttemptId is required');
    }

    try {
      const updated = await this.repository.allocateInventory({
        allocationId: request.allocationId,
        productionAttemptId: request.productionAttemptId,
        allocatedByUserId: actor.userId,
      });

      return toAllocationResponse(updated);
    } catch (error) {
      mapAllocationTransitionError(
        error,
        'Allocation must be in HOLD or RESERVED status to allocate',
      );
    }
  }
}

@Injectable()
export class ConsumeInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepository,
  ) {}

  async execute(request: ConsumeInventoryRequest): Promise<AllocationResponse> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));

    try {
      const updated = await this.repository.consumeInventory({
        allocationId: request.allocationId,
        allocatedByUserId: actor.userId,
      });

      return toAllocationResponse(updated);
    } catch (error) {
      mapAllocationTransitionError(
        error,
        'Allocation must be in ALLOCATED status to consume',
      );
    }
  }
}

@Injectable()
export class ReleaseInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepository,
  ) {}

  async execute(request: ReleaseInventoryRequest): Promise<AllocationResponse> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));

    try {
      const updated = await this.repository.releaseInventory({
        allocationId: request.allocationId,
        reason: request.reason,
        allocatedByUserId: actor.userId,
      });

      return toAllocationResponse(updated);
    } catch (error) {
      mapAllocationTransitionError(
        error,
        'Cannot release already consumed or released allocation',
      );
    }
  }
}
