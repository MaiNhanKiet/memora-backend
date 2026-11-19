import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { PERMISSIONS } from '@app/contracts';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { PersonalizationGrpcClient } from '../../clients/personalization-grpc.client';
import {
  ApiGetSourceProcessingDocs,
  ApiListOrderSourcesDocs,
} from '../docs/sources.swagger';
import type { PersonalizationSourceResponseDto } from '../dto/personalization-source.response.dto';
import type { SourceProcessingResponseDto } from '../dto/source-processing.response.dto';
import { toPersonalizationSourceListResponse } from '../mappers/personalization-source-http.mapper';
import { toSourceProcessingResponse } from '../mappers/source-processing-http.mapper';

@ApiTags('personalization-sources')
@Controller()
@RequirePermissions(PERMISSIONS.DESIGN_SUBMIT_OWN)
export class SourcesController {
  constructor(
    private readonly personalizationClient: PersonalizationGrpcClient,
  ) {}

  // [PERSO-011] GET /api/v1/orders/:orderId/personalization-sources
  @Get('orders/:orderId/personalization-sources')
  @ApiListOrderSourcesDocs()
  async listOrderSources(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<PersonalizationSourceResponseDto[]> {
    const response = await this.personalizationClient.listOrderSources({
      actor: toVerifiedActor(principal),
      orderId,
    });
    return toPersonalizationSourceListResponse(response);
  }

  // [PERSO-012] GET /api/v1/personalization-sources/:sourceId/processing
  @Get('personalization-sources/:sourceId/processing')
  @ApiGetSourceProcessingDocs()
  async getSourceProcessing(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ): Promise<SourceProcessingResponseDto> {
    const response = await this.personalizationClient.getSourceProcessing({
      actor: toVerifiedActor(principal),
      sourceId,
    });
    return toSourceProcessingResponse(response);
  }
}
