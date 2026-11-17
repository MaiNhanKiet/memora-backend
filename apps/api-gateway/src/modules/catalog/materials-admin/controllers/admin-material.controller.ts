import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/auth';
import { PERMISSIONS } from '@app/contracts';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CatalogGrpcClient } from '../../clients/catalog-grpc.client';
import {
  CreateGemstoneOptionBodyDto,
  CreateMaterialBodyDto,
  CreateVariantBodyDto,
  UpdateCompatibilitiesBodyDto,
  UpdateMaterialBodyDto,
  UpdateResizePoliciesBodyDto,
  UpdateVariantBodyDto,
} from '../dto';
import {
  ApiCreateGemstoneOptionDocs,
  ApiCreateMaterialDocs,
  ApiCreateVariantDocs,
  ApiUpdateCompatibilitiesDocs,
  ApiUpdateMaterialDocs,
  ApiUpdateResizePoliciesDocs,
  ApiUpdateVariantDocs,
} from '../docs/admin-material.swagger';
import {
  toCreateGemstoneOptionGrpcRequest,
  toCreateMaterialGrpcRequest,
  toCreateVariantGrpcRequest,
  toUpdateCompatibilitiesGrpcRequest,
  toUpdateMaterialGrpcRequest,
  toUpdateResizePoliciesGrpcRequest,
  toUpdateVariantGrpcRequest,
} from '../mappers/admin-material-http.mapper';

@ApiTags('commerce-admin-catalog')
@Controller('admin/catalog')
export class AdminMaterialController {
  constructor(private readonly catalogClient: CatalogGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [CATAL-010] POST /api/v1/admin/catalog/materials
  // ---------------------------------------------------------------------------
  @Post('materials')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.CATALOG_OPTION_MANAGE)
  @ApiCreateMaterialDocs()
  async createMaterial(@Body() body: CreateMaterialBodyDto) {
    return this.catalogClient.createMaterial(toCreateMaterialGrpcRequest(body));
  }

  // ---------------------------------------------------------------------------
  // [CATAL-011] PATCH /api/v1/admin/catalog/materials/:materialId
  // ---------------------------------------------------------------------------
  @Patch('materials/:materialId')
  @RequirePermissions(PERMISSIONS.CATALOG_OPTION_MANAGE)
  @ApiUpdateMaterialDocs()
  async updateMaterial(
    @Param('materialId', ParseUUIDPipe) materialId: string,
    @Body() body: UpdateMaterialBodyDto,
  ) {
    return this.catalogClient.updateMaterial(
      toUpdateMaterialGrpcRequest(materialId, body),
    );
  }

  // ---------------------------------------------------------------------------
  // [CATAL-013] POST /api/v1/admin/catalog/variants
  // ---------------------------------------------------------------------------
  @Post('variants')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.CATALOG_VARIANT_MANAGE)
  @ApiCreateVariantDocs()
  async createVariant(
    @Body() body: CreateVariantBodyDto,
    @CurrentUser() principal?: AuthenticatedPrincipal,
  ) {
    return this.catalogClient.createVariant(
      toCreateVariantGrpcRequest(body, principal?.userId),
    );
  }

  // ---------------------------------------------------------------------------
  // [CATAL-014] PATCH /api/v1/admin/catalog/variants/:variantId
  // ---------------------------------------------------------------------------
  @Patch('variants/:variantId')
  @RequirePermissions(PERMISSIONS.CATALOG_VARIANT_MANAGE)
  @ApiUpdateVariantDocs()
  async updateVariant(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() body: UpdateVariantBodyDto,
  ) {
    return this.catalogClient.updateVariant(
      toUpdateVariantGrpcRequest(variantId, body),
    );
  }

  // ---------------------------------------------------------------------------
  // [CATAL-017] POST /api/v1/admin/catalog/gemstone-options
  // ---------------------------------------------------------------------------
  @Post('gemstone-options')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.CATALOG_OPTION_MANAGE)
  @ApiCreateGemstoneOptionDocs()
  async createGemstoneOption(@Body() body: CreateGemstoneOptionBodyDto) {
    return this.catalogClient.createGemstoneOption(
      toCreateGemstoneOptionGrpcRequest(body),
    );
  }

  // ---------------------------------------------------------------------------
  // [CATAL-018] PUT /api/v1/admin/catalog/compatibilities
  // ---------------------------------------------------------------------------
  @Put('compatibilities')
  @RequirePermissions(PERMISSIONS.CATALOG_OPTION_MANAGE)
  @ApiUpdateCompatibilitiesDocs()
  async updateCompatibilities(@Body() body: UpdateCompatibilitiesBodyDto) {
    return this.catalogClient.updateCompatibilities(
      toUpdateCompatibilitiesGrpcRequest(body),
    );
  }

  // ---------------------------------------------------------------------------
  // [CATAL-020] PUT /api/v1/admin/catalog/resize-policies
  // ---------------------------------------------------------------------------
  @Put('resize-policies')
  @RequirePermissions(PERMISSIONS.CATALOG_VARIANT_MANAGE)
  @ApiUpdateResizePoliciesDocs()
  async updateResizePolicies(
    @Param('templateVariantId') templateVariantId: string,
    @Body() body: UpdateResizePoliciesBodyDto,
  ) {
    const res = await this.catalogClient.updateResizePolicies(
      toUpdateResizePoliciesGrpcRequest(templateVariantId, body),
    );
    return res.data;
  }
}
