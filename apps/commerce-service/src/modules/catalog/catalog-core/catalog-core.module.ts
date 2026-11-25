import { Module } from '@nestjs/common';
import { CATALOG_REPOSITORY } from './application/catalog.repository';
import { GemstoneUseCases } from './application/gemstone.use-cases';
import { MaterialUseCases } from './application/material.use-cases';
import { ResizePolicyUseCases } from './application/resize-policy.use-cases';
import { TemplateUseCases } from './application/template.use-cases';
import { ValidateConfigurationUseCase } from './application/validate-configuration.use-case';
import { VariantUseCases } from './application/variant.use-cases';
import { PrismaCatalogRepository } from './infrastructure/prisma-catalog.repository';
import { CatalogGrpcController } from './presentation/catalog.grpc.controller';

@Module({
  controllers: [CatalogGrpcController],
  providers: [
    TemplateUseCases,
    MaterialUseCases,
    VariantUseCases,
    GemstoneUseCases,
    ResizePolicyUseCases,
    ValidateConfigurationUseCase,
    { provide: CATALOG_REPOSITORY, useClass: PrismaCatalogRepository },
  ],
  exports: [CATALOG_REPOSITORY],
})
export class CatalogCoreModule {}
