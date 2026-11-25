import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  ArchiveTemplateRequest,
  CatalogServiceHandler,
  CreateGemstoneOptionRequest,
  CreateMaterialRequest,
  CreateTemplateRequest,
  CreateVariantRequest,
  GemstoneOptionResponse,
  GetResizePoliciesRequest,
  GetTemplate3DAssetsRequest,
  GetTemplateByIdRequest,
  GetTemplateConfigurationOptionsRequest,
  ListGemstoneOptionsRequest,
  ListGemstoneOptionsResponse,
  ListGemstoneSlotsRequest,
  ListGemstoneSlotsResponse,
  ListMaterialsRequest,
  ListMaterialsResponse,
  ListTemplatesRequest,
  ListTemplatesResponse,
  ListTemplateVariantsRequest,
  ListTemplateVariantsResponse,
  MaterialResponse,
  PublishTemplateRequest,
  ResizePoliciesResponse,
  Template3DAssetsResponse,
  TemplateConfigurationOptionsResponse,
  TemplateResponse,
  TemplateVariantResponse,
  UpdateCompatibilitiesRequest,
  UpdateCompatibilitiesResponse,
  UpdateMaterialRequest,
  UpdateResizePoliciesRequest,
  UpdateTemplateRequest,
  UpdateVariantRequest,
  ValidateConfigurationRequest,
  ValidateConfigurationResponse,
} from '@app/contracts';
import { CommerceInternalGrpcAuthGuard } from '../../../../grpc/commerce-internal-grpc-auth.guard';
import {
  CreateGemstoneOptionUseCase,
  ListGemstoneOptionsUseCase,
  ListGemstoneSlotsUseCase,
  UpdateCompatibilitiesUseCase,
} from '../application/gemstone.use-cases';
import {
  CreateMaterialUseCase,
  ListMaterialsUseCase,
  UpdateMaterialUseCase,
} from '../application/material.use-cases';
import {
  GetResizePoliciesUseCase,
  UpdateResizePoliciesUseCase,
} from '../application/resize-policy.use-cases';
import {
  GetTemplate3DAssetsUseCase,
  GetTemplateByIdUseCase,
  GetTemplateConfigurationOptionsUseCase,
  ListTemplatesUseCase,
} from '../application/template-query.use-cases';
import {
  ArchiveTemplateUseCase,
  CreateTemplateUseCase,
  PublishTemplateUseCase,
  UpdateTemplateUseCase,
} from '../application/template.use-cases';
import { ValidateConfigurationUseCase } from '../application/validate-configuration.use-case';
import {
  CreateVariantUseCase,
  ListTemplateVariantsUseCase,
  UpdateVariantUseCase,
} from '../application/variant.use-cases';

/** Thin gRPC adapter. Business rules and validation live in the use cases. */
@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class CatalogGrpcController implements CatalogServiceHandler {
  constructor(
    private readonly listTemplatesUseCase: ListTemplatesUseCase,
    private readonly getTemplateByIdUseCase: GetTemplateByIdUseCase,
    private readonly getTemplateConfigurationOptionsUseCase: GetTemplateConfigurationOptionsUseCase,
    private readonly getTemplate3DAssetsUseCase: GetTemplate3DAssetsUseCase,
    private readonly createTemplateUseCase: CreateTemplateUseCase,
    private readonly updateTemplateUseCase: UpdateTemplateUseCase,
    private readonly publishTemplateUseCase: PublishTemplateUseCase,
    private readonly archiveTemplateUseCase: ArchiveTemplateUseCase,
    private readonly listMaterialsUseCase: ListMaterialsUseCase,
    private readonly createMaterialUseCase: CreateMaterialUseCase,
    private readonly updateMaterialUseCase: UpdateMaterialUseCase,
    private readonly listTemplateVariantsUseCase: ListTemplateVariantsUseCase,
    private readonly createVariantUseCase: CreateVariantUseCase,
    private readonly updateVariantUseCase: UpdateVariantUseCase,
    private readonly listGemstoneOptionsUseCase: ListGemstoneOptionsUseCase,
    private readonly listGemstoneSlotsUseCase: ListGemstoneSlotsUseCase,
    private readonly createGemstoneOptionUseCase: CreateGemstoneOptionUseCase,
    private readonly updateCompatibilitiesUseCase: UpdateCompatibilitiesUseCase,
    private readonly getResizePoliciesUseCase: GetResizePoliciesUseCase,
    private readonly updateResizePoliciesUseCase: UpdateResizePoliciesUseCase,
    private readonly validateConfigurationUseCase: ValidateConfigurationUseCase,
  ) {}

  @GrpcMethod('CatalogService', 'ListTemplates')
  listTemplates(request: ListTemplatesRequest): Promise<ListTemplatesResponse> {
    return this.listTemplatesUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'GetTemplateById')
  getTemplateById(request: GetTemplateByIdRequest): Promise<TemplateResponse> {
    return this.getTemplateByIdUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'GetTemplateConfigurationOptions')
  getTemplateConfigurationOptions(
    request: GetTemplateConfigurationOptionsRequest,
  ): Promise<TemplateConfigurationOptionsResponse> {
    return this.getTemplateConfigurationOptionsUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'GetTemplate3DAssets')
  getTemplate3DAssets(
    request: GetTemplate3DAssetsRequest,
  ): Promise<Template3DAssetsResponse> {
    return this.getTemplate3DAssetsUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'ListMaterials')
  listMaterials(request: ListMaterialsRequest): Promise<ListMaterialsResponse> {
    return this.listMaterialsUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'ListTemplateVariants')
  listTemplateVariants(
    request: ListTemplateVariantsRequest,
  ): Promise<ListTemplateVariantsResponse> {
    return this.listTemplateVariantsUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'ListGemstoneOptions')
  listGemstoneOptions(
    request: ListGemstoneOptionsRequest,
  ): Promise<ListGemstoneOptionsResponse> {
    return this.listGemstoneOptionsUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'ListGemstoneSlots')
  listGemstoneSlots(
    request: ListGemstoneSlotsRequest,
  ): Promise<ListGemstoneSlotsResponse> {
    return this.listGemstoneSlotsUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'ValidateConfiguration')
  validateConfiguration(
    request: ValidateConfigurationRequest,
  ): Promise<ValidateConfigurationResponse> {
    return this.validateConfigurationUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'CreateTemplate')
  createTemplate(request: CreateTemplateRequest): Promise<TemplateResponse> {
    return this.createTemplateUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'UpdateTemplate')
  updateTemplate(request: UpdateTemplateRequest): Promise<TemplateResponse> {
    return this.updateTemplateUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'PublishTemplate')
  publishTemplate(request: PublishTemplateRequest): Promise<TemplateResponse> {
    return this.publishTemplateUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'ArchiveTemplate')
  archiveTemplate(request: ArchiveTemplateRequest): Promise<TemplateResponse> {
    return this.archiveTemplateUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'CreateMaterial')
  createMaterial(request: CreateMaterialRequest): Promise<MaterialResponse> {
    return this.createMaterialUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'UpdateMaterial')
  updateMaterial(request: UpdateMaterialRequest): Promise<MaterialResponse> {
    return this.updateMaterialUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'CreateVariant')
  createVariant(
    request: CreateVariantRequest,
  ): Promise<TemplateVariantResponse> {
    return this.createVariantUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'UpdateVariant')
  updateVariant(
    request: UpdateVariantRequest,
  ): Promise<TemplateVariantResponse> {
    return this.updateVariantUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'CreateGemstoneOption')
  createGemstoneOption(
    request: CreateGemstoneOptionRequest,
  ): Promise<GemstoneOptionResponse> {
    return this.createGemstoneOptionUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'UpdateCompatibilities')
  updateCompatibilities(
    request: UpdateCompatibilitiesRequest,
  ): Promise<UpdateCompatibilitiesResponse> {
    return this.updateCompatibilitiesUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'GetResizePolicies')
  getResizePolicies(
    request: GetResizePoliciesRequest,
  ): Promise<ResizePoliciesResponse> {
    return this.getResizePoliciesUseCase.execute(request);
  }

  @GrpcMethod('CatalogService', 'UpdateResizePolicies')
  updateResizePolicies(
    request: UpdateResizePoliciesRequest,
  ): Promise<ResizePoliciesResponse> {
    return this.updateResizePoliciesUseCase.execute(request);
  }
}
