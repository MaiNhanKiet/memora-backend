import { Module } from '@nestjs/common';
import { CATALOG_REPOSITORY } from './application/catalog.repository';
import {
  CreateGemstoneOptionUseCase,
  ListGemstoneOptionsUseCase,
  ListGemstoneSlotsUseCase,
  UpdateCompatibilitiesUseCase,
} from './application/gemstone.use-cases';
import {
  CreateMaterialUseCase,
  ListMaterialsUseCase,
  UpdateMaterialUseCase,
} from './application/material.use-cases';
import {
  GetResizePoliciesUseCase,
  UpdateResizePoliciesUseCase,
} from './application/resize-policy.use-cases';
import {
  GetTemplate3DAssetsUseCase,
  GetTemplateByIdUseCase,
  GetTemplateConfigurationOptionsUseCase,
  ListTemplatesUseCase,
} from './application/template-query.use-cases';
import {
  ArchiveTemplateUseCase,
  CreateTemplateUseCase,
  PublishTemplateUseCase,
  UpdateTemplateUseCase,
} from './application/template.use-cases';
import { ValidateConfigurationUseCase } from './application/validate-configuration.use-case';
import {
  CreateVariantUseCase,
  ListTemplateVariantsUseCase,
  UpdateVariantUseCase,
} from './application/variant.use-cases';
import { PrismaCatalogRepository } from './infrastructure/prisma-catalog.repository';
import { CatalogGrpcController } from './presentation/catalog.grpc.controller';

@Module({
  controllers: [CatalogGrpcController],
  providers: [
    ListTemplatesUseCase,
    GetTemplateByIdUseCase,
    GetTemplateConfigurationOptionsUseCase,
    GetTemplate3DAssetsUseCase,
    CreateTemplateUseCase,
    UpdateTemplateUseCase,
    PublishTemplateUseCase,
    ArchiveTemplateUseCase,
    ListMaterialsUseCase,
    CreateMaterialUseCase,
    UpdateMaterialUseCase,
    ListTemplateVariantsUseCase,
    CreateVariantUseCase,
    UpdateVariantUseCase,
    ListGemstoneOptionsUseCase,
    ListGemstoneSlotsUseCase,
    CreateGemstoneOptionUseCase,
    UpdateCompatibilitiesUseCase,
    GetResizePoliciesUseCase,
    UpdateResizePoliciesUseCase,
    ValidateConfigurationUseCase,
    { provide: CATALOG_REPOSITORY, useClass: PrismaCatalogRepository },
  ],
  exports: [CATALOG_REPOSITORY],
})
export class CatalogCoreModule {}
