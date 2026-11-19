import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { PERMISSIONS } from '@app/contracts';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { PersonalizationGrpcClient } from '../../clients/personalization-grpc.client';
import { ApiListOrderSourcesDocs } from '../docs/sources.swagger';
import type { PersonalizationSourceResponseDto } from '../dto/personalization-source.response.dto';
import { toPersonalizationSourceListResponse } from '../mappers/personalization-source-http.mapper';

@ApiTags('personalization-sources')
@Controller('orders/:orderId/personalization-sources')
@RequirePermissions(PERMISSIONS.DESIGN_SUBMIT_OWN)
export class SourcesController {
  constructor(
    private readonly personalizationClient: PersonalizationGrpcClient,
  ) {}

  // [PERSO-011] GET /api/v1/orders/:orderId/personalization-sources
  @Get()
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
}
