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

@Injectable()
export class AllocationUseCases {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepository,
  ) {}

  async holdInventory(
    request: HoldInventoryRequest,
  ): Promise<AllocationResponse> {
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

  async reserveInventory(
    request: ReserveInventoryRequest,
  ): Promise<AllocationResponse> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));

    try {
      const updated = await this.repository.reserveInventory({
        allocationId: request.allocationId,
        allocatedByUserId: actor.userId,
      });

      return toAllocationResponse(updated);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'ALLOCATION_NOT_FOUND') {
          throw new NotFoundException(error.message);
        }
        if (error.message === 'INVALID_ALLOCATION_STATUS') {
          throw new BadRequestException(
            'Allocation can only be reserved from HOLD status',
          );
        }
      }
      throw error;
    }
  }

  async allocateInventory(
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
      if (error instanceof Error) {
        if (error.message === 'ALLOCATION_NOT_FOUND') {
          throw new NotFoundException(error.message);
        }
        if (error.message === 'INVALID_ALLOCATION_STATUS') {
          throw new BadRequestException(
            'Allocation must be in HOLD or RESERVED status to allocate',
          );
        }
      }
      throw error;
    }
  }

  async consumeInventory(
    request: ConsumeInventoryRequest,
  ): Promise<AllocationResponse> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));

    try {
      const updated = await this.repository.consumeInventory({
        allocationId: request.allocationId,
        allocatedByUserId: actor.userId,
      });

      return toAllocationResponse(updated);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'ALLOCATION_NOT_FOUND') {
          throw new NotFoundException(error.message);
        }
        if (error.message === 'INVALID_ALLOCATION_STATUS') {
          throw new BadRequestException(
            'Allocation must be in ALLOCATED status to consume',
          );
        }
      }
      throw error;
    }
  }

  async releaseInventory(
    request: ReleaseInventoryRequest,
  ): Promise<AllocationResponse> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));

    try {
      const updated = await this.repository.releaseInventory({
        allocationId: request.allocationId,
        reason: request.reason,
        allocatedByUserId: actor.userId,
      });

      return toAllocationResponse(updated);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'ALLOCATION_NOT_FOUND') {
          throw new NotFoundException(error.message);
        }
        if (error.message === 'INVALID_ALLOCATION_STATUS') {
          throw new BadRequestException(
            'Cannot release already consumed or released allocation',
          );
        }
      }
      throw error;
    }
  }
}
