import { Inject, Injectable } from '@nestjs/common';
import { parseVerifiedActor, requireCustomerActor } from '@app/common';
import type {
  GetSourceProcessingRequest,
  SourceProcessing,
} from '@app/contracts';
import {
  ORDER_SOURCES_REPOSITORY,
  type OrderSourcesRepository,
} from './order-sources.repository';
import { sourceErrors, SourceReason } from './sources.errors';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * PERSO-012. Read only. A missing, DELETED or foreign source is the same 404, so the
 * answer does not reveal whether the id exists.
 */
@Injectable()
export class GetSourceProcessingUseCase {
  constructor(
    @Inject(ORDER_SOURCES_REPOSITORY)
    private readonly sources: OrderSourcesRepository,
  ) {}

  async execute(
    request: GetSourceProcessingRequest,
  ): Promise<SourceProcessing> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    if (typeof request.sourceId !== 'string' || !UUID.test(request.sourceId)) {
      throw sourceErrors.invalid(SourceReason.INVALID_SOURCE_ID);
    }
    const record = await this.sources.findProcessing(
      request.sourceId.toLowerCase(),
      actor.customerIdentityId,
    );
    if (record === undefined) {
      throw sourceErrors.notFound(SourceReason.SOURCE_NOT_FOUND);
    }
    return {
      sourceId: record.sourceId,
      sourceType: record.sourceType,
      status: record.status,
      ...(record.failureCode === undefined
        ? {}
        : { failureCode: record.failureCode }),
      ...(record.startedAt === undefined
        ? {}
        : { startedAt: record.startedAt.toISOString() }),
      ...(record.finishedAt === undefined
        ? {}
        : { finishedAt: record.finishedAt.toISOString() }),
    };
  }
}
