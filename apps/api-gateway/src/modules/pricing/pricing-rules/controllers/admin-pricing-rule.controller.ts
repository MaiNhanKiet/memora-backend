import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { PricingGrpcClient } from '../../clients/pricing-grpc.client';
import { CreatePricingRuleBodyDto, ListPricingRulesQueryDto } from '../dto';
import {
  ApiActivatePricingRuleDocs,
  ApiCreatePricingRuleDocs,
  ApiListPricingRulesDocs,
} from '../docs/admin-pricing-rule.swagger';
import {
  toActivatePricingRuleGrpcRequest,
  toCreatePricingRuleGrpcRequest,
  toListPricingRulesGrpcRequest,
} from '../mappers/pricing-rule-http.mapper';

@ApiTags('commerce-admin-pricing')
@Controller('admin/pricing')
@Roles('MANAGER', 'ADMIN')
export class AdminPricingRuleController {
  constructor(private readonly pricingClient: PricingGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [PRICI-008] GET /api/v1/admin/pricing/rules
  // ---------------------------------------------------------------------------
  @Get('rules')
  @HttpCode(HttpStatus.OK)
  @ApiListPricingRulesDocs()
  async listPricingRules(@Query() query: ListPricingRulesQueryDto) {
    return this.pricingClient.listPricingRules(
      toListPricingRulesGrpcRequest(query),
    );
  }

  // ---------------------------------------------------------------------------
  // [PRICI-009] POST /api/v1/admin/pricing/rules
  // ---------------------------------------------------------------------------
  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatePricingRuleDocs()
  async createPricingRule(
    @Body() body: CreatePricingRuleBodyDto,
    @CurrentUser() actor?: AuthenticatedPrincipal,
  ) {
    return this.pricingClient.createPricingRule(
      toCreatePricingRuleGrpcRequest(body, actor?.userId),
    );
  }

  // ---------------------------------------------------------------------------
  // [PRICI-010] POST /api/v1/admin/pricing/rules/:ruleId/activate
  // ---------------------------------------------------------------------------
  @Post('rules/:ruleId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiActivatePricingRuleDocs()
  async activatePricingRule(
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @CurrentUser() actor?: AuthenticatedPrincipal,
  ) {
    return this.pricingClient.activatePricingRule(
      toActivatePricingRuleGrpcRequest(ruleId, actor?.userId),
    );
  }
}
