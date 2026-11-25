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
import { GemstoneUseCases } from '../application/gemstone.use-cases';
import { MaterialUseCases } from '../application/material.use-cases';
import { ResizePolicyUseCases } from '../application/resize-policy.use-cases';
import { TemplateUseCases } from '../application/template.use-cases';
import { ValidateConfigurationUseCase } from '../application/validate-configuration.use-case';
import { VariantUseCases } from '../application/variant.use-cases';
import { CommerceInternalGrpcAuthGuard } from '../../../../grpc/commerce-internal-grpc-auth.guard';

@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class CatalogGrpcController implements CatalogServiceHandler {
  constructor(
    private readonly templateUseCases: TemplateUseCases,
    private readonly materialUseCases: MaterialUseCases,
    private readonly variantUseCases: VariantUseCases,
    private readonly gemstoneUseCases: GemstoneUseCases,
    private readonly resizePolicyUseCases: ResizePolicyUseCases,
    private readonly validateConfigurationUseCase: ValidateConfigurationUseCase,
  ) {}

  @GrpcMethod('CatalogService', 'ListTemplates')
  listTemplates(request: ListTemplatesRequest): Promise<ListTemplatesResponse> {
    return this.templateUseCases.listTemplates(request);
  }

  @GrpcMethod('CatalogService', 'GetTemplateById')
  getTemplateById(request: GetTemplateByIdRequest): Promise<TemplateResponse> {
    return this.templateUseCases.getTemplateById(request);
  }

  @GrpcMethod('CatalogService', 'GetTemplateConfigurationOptions')
  getTemplateConfigurationOptions(
    request: GetTemplateConfigurationOptionsRequest,
  ): Promise<TemplateConfigurationOptionsResponse> {
    return this.templateUseCases.getTemplateConfigurationOptions(request);
  }

  @GrpcMethod('CatalogService', 'GetTemplate3DAssets')
  getTemplate3DAssets(
    request: GetTemplate3DAssetsRequest,
  ): Promise<Template3DAssetsResponse> {
    return this.templateUseCases.getTemplate3DAssets(request);
  }

  @GrpcMethod('CatalogService', 'ListMaterials')
  listMaterials(request: ListMaterialsRequest): Promise<ListMaterialsResponse> {
    return this.materialUseCases.listMaterials(request);
  }

  @GrpcMethod('CatalogService', 'ListTemplateVariants')
  listTemplateVariants(
    request: ListTemplateVariantsRequest,
  ): Promise<ListTemplateVariantsResponse> {
    return this.variantUseCases.listTemplateVariants(request);
  }

  @GrpcMethod('CatalogService', 'ListGemstoneOptions')
  listGemstoneOptions(
    request: ListGemstoneOptionsRequest,
  ): Promise<ListGemstoneOptionsResponse> {
    return this.gemstoneUseCases.listGemstoneOptions(request);
  }

  @GrpcMethod('CatalogService', 'ListGemstoneSlots')
  listGemstoneSlots(
    request: ListGemstoneSlotsRequest,
  ): Promise<ListGemstoneSlotsResponse> {
    return this.gemstoneUseCases.listGemstoneSlots(request);
  }

  @GrpcMethod('CatalogService', 'ValidateConfiguration')
  validateConfiguration(
    request: ValidateConfigurationRequest,
  ): Promise<ValidateConfigurationResponse> {
    return this.validateConfigurationUseCase.execute(request);
  }

  // ---------------------------------------------------------------------------
  // Admin APIs
  // ---------------------------------------------------------------------------

  @GrpcMethod('CatalogService', 'CreateTemplate')
  createTemplate(request: CreateTemplateRequest): Promise<TemplateResponse> {
    return this.templateUseCases.createTemplate(request);
  }

  @GrpcMethod('CatalogService', 'UpdateTemplate')
  updateTemplate(request: UpdateTemplateRequest): Promise<TemplateResponse> {
    return this.templateUseCases.updateTemplate(request);
  }

  @GrpcMethod('CatalogService', 'PublishTemplate')
  publishTemplate(request: PublishTemplateRequest): Promise<TemplateResponse> {
    return this.templateUseCases.publishTemplate(request);
  }

  @GrpcMethod('CatalogService', 'ArchiveTemplate')
  archiveTemplate(request: ArchiveTemplateRequest): Promise<TemplateResponse> {
    return this.templateUseCases.archiveTemplate(request);
  }

  @GrpcMethod('CatalogService', 'CreateMaterial')
  createMaterial(request: CreateMaterialRequest): Promise<MaterialResponse> {
    return this.materialUseCases.createMaterial(request);
  }

  @GrpcMethod('CatalogService', 'UpdateMaterial')
  updateMaterial(request: UpdateMaterialRequest): Promise<MaterialResponse> {
    return this.materialUseCases.updateMaterial(request);
  }

  @GrpcMethod('CatalogService', 'CreateVariant')
  createVariant(
    request: CreateVariantRequest,
  ): Promise<TemplateVariantResponse> {
    return this.variantUseCases.createVariant(request);
  }

  @GrpcMethod('CatalogService', 'UpdateVariant')
  updateVariant(
    request: UpdateVariantRequest,
  ): Promise<TemplateVariantResponse> {
    return this.variantUseCases.updateVariant(request);
  }

  @GrpcMethod('CatalogService', 'CreateGemstoneOption')
  createGemstoneOption(
    request: CreateGemstoneOptionRequest,
  ): Promise<GemstoneOptionResponse> {
    return this.gemstoneUseCases.createGemstoneOption(request);
  }

  @GrpcMethod('CatalogService', 'UpdateCompatibilities')
  updateCompatibilities(
    request: UpdateCompatibilitiesRequest,
  ): Promise<UpdateCompatibilitiesResponse> {
    return this.gemstoneUseCases.updateCompatibilities(request);
  }

  @GrpcMethod('CatalogService', 'GetResizePolicies')
  getResizePolicies(
    request: GetResizePoliciesRequest,
  ): Promise<ResizePoliciesResponse> {
    return this.resizePolicyUseCases.getResizePolicies(request);
  }

  @GrpcMethod('CatalogService', 'UpdateResizePolicies')
  updateResizePolicies(
    request: UpdateResizePoliciesRequest,
  ): Promise<ResizePoliciesResponse> {
    return this.resizePolicyUseCases.updateResizePolicies(request);
  }
}
