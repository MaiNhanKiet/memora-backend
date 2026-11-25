import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  GetRingItemDetailsRequest,
  GetRingItemDetailsResponse,
  ListRingItemVersionsRequest,
  ListRingItemVersionsResponse,
  UpdateCurrentRingItemVersionRequest,
  UpdateCurrentRingItemVersionResponse,
} from '@app/contracts';
import { mapRingItemDetail, mapRingItemVersion } from './ordering.mapper';
import {
  ORDERING_REPOSITORY,
  type OrderingRepository,
} from './ordering.repository';
import {
  resolveOrderingActorId,
  validateOrderingActor,
} from './ordering.validation';

@Injectable()
export class GetRingItemDetailsUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: GetRingItemDetailsRequest,
  ): Promise<GetRingItemDetailsResponse> {
    const actor = validateOrderingActor(request.actor);
    const { actorId, guestSessionId } = resolveOrderingActorId(actor);

    const item = await this.repository.findRingItemWithDetails(
      request.orderId,
      request.ringItemId,
      actorId,
      guestSessionId,
    );
    if (!item) {
      throw new NotFoundException(
        'Ring item not found in this order or access denied',
      );
    }

    return mapRingItemDetail(item);
  }
}

@Injectable()
export class ListRingItemVersionsUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: ListRingItemVersionsRequest,
  ): Promise<ListRingItemVersionsResponse> {
    const actor = validateOrderingActor(request.actor);
    const { actorId, guestSessionId } = resolveOrderingActorId(actor);

    const versions = await this.repository.listRingItemVersions(
      request.orderId,
      request.ringItemId,
      actorId,
      guestSessionId,
    );
    if (!versions) {
      throw new NotFoundException(
        'Order or ring item not found or access denied',
      );
    }

    return {
      ringItemId: request.ringItemId,
      orderId: request.orderId,
      versions: versions.map((v) => mapRingItemVersion(v)),
    };
  }
}

@Injectable()
export class UpdateCurrentRingItemVersionUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: UpdateCurrentRingItemVersionRequest,
  ): Promise<UpdateCurrentRingItemVersionResponse> {
    const actor = validateOrderingActor(request.actor);
    const { actorId, guestSessionId } = resolveOrderingActorId(actor);

    const currentVersion = await this.repository.findCurrentRingItemVersion(
      request.orderId,
      request.ringItemId,
      actorId,
      guestSessionId,
    );
    if (!currentVersion) {
      throw new NotFoundException(
        'Ring item current version not found or access denied',
      );
    }

    if (
      currentVersion.status !== 'DRAFT' &&
      currentVersion.status !== 'SUBMITTED'
    ) {
      throw new BadRequestException(
        `Cannot modify ring item version in status '${currentVersion.status}'. Only DRAFT or SUBMITTED versions can be updated.`,
      );
    }

    const updated = await this.repository.updateCurrentRingItemVersion(
      currentVersion.id,
      {
        targetSize: request.targetSize,
        changeReason: request.changeReason,
        memoryEnabled: request.memoryEnabled,
      },
    );

    return {
      ringItemId: request.ringItemId,
      versionId: updated.id,
      versionNo: updated.versionNo,
      status: updated.status,
      targetSize: updated.targetSize,
      changeReason: updated.changeReason,
      updatedAt: updated.createdAt.toISOString(),
    };
  }
}
