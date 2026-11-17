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
import { CatalogService } from '../application/catalog.service';
import { CommerceInternalGrpcAuthGuard } from '../../../../grpc/commerce-internal-grpc-auth.guard';

@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class CatalogGrpcController implements CatalogServiceHandler {
  constructor(private readonly catalogService: CatalogService) {}

  @GrpcMethod('CatalogService', 'ListTemplates')
  listTemplates(request: ListTemplatesRequest): Promise<ListTemplatesResponse> {
    return this.catalogService.listTemplates(request);
  }

  @GrpcMethod('CatalogService', 'GetTemplateById')
  getTemplateById(request: GetTemplateByIdRequest): Promise<TemplateResponse> {
    return this.catalogService.getTemplateById(request);
  }

  @GrpcMethod('CatalogService', 'GetTemplateConfigurationOptions')
  getTemplateConfigurationOptions(
    request: GetTemplateConfigurationOptionsRequest,
  ): Promise<TemplateConfigurationOptionsResponse> {
    return this.catalogService.getTemplateConfigurationOptions(request);
  }

  @GrpcMethod('CatalogService', 'GetTemplate3DAssets')
  getTemplate3DAssets(
    request: GetTemplate3DAssetsRequest,
  ): Promise<Template3DAssetsResponse> {
    return this.catalogService.getTemplate3DAssets(request);
  }

  @GrpcMethod('CatalogService', 'ListMaterials')
  listMaterials(request: ListMaterialsRequest): Promise<ListMaterialsResponse> {
    return this.catalogService.listMaterials(request);
  }

  @GrpcMethod('CatalogService', 'ListTemplateVariants')
  listTemplateVariants(
    request: ListTemplateVariantsRequest,
  ): Promise<ListTemplateVariantsResponse> {
    return this.catalogService.listTemplateVariants(request);
  }

  @GrpcMethod('CatalogService', 'ListGemstoneOptions')
  listGemstoneOptions(
    request: ListGemstoneOptionsRequest,
  ): Promise<ListGemstoneOptionsResponse> {
    return this.catalogService.listGemstoneOptions(request);
  }

  @GrpcMethod('CatalogService', 'ListGemstoneSlots')
  listGemstoneSlots(
    request: ListGemstoneSlotsRequest,
  ): Promise<ListGemstoneSlotsResponse> {
    return this.catalogService.listGemstoneSlots(request);
  }

  @GrpcMethod('CatalogService', 'ValidateConfiguration')
  validateConfiguration(
    request: ValidateConfigurationRequest,
  ): Promise<ValidateConfigurationResponse> {
    return this.catalogService.validateConfiguration(request);
  }

  // ---------------------------------------------------------------------------
  // Admin APIs
  // ---------------------------------------------------------------------------

  @GrpcMethod('CatalogService', 'CreateTemplate')
  createTemplate(request: CreateTemplateRequest): Promise<TemplateResponse> {
    return this.catalogService.createTemplate(request);
  }

  @GrpcMethod('CatalogService', 'UpdateTemplate')
  updateTemplate(request: UpdateTemplateRequest): Promise<TemplateResponse> {
    return this.catalogService.updateTemplate(request);
  }

  @GrpcMethod('CatalogService', 'PublishTemplate')
  publishTemplate(request: PublishTemplateRequest): Promise<TemplateResponse> {
    return this.catalogService.publishTemplate(request);
  }

  @GrpcMethod('CatalogService', 'ArchiveTemplate')
  archiveTemplate(request: ArchiveTemplateRequest): Promise<TemplateResponse> {
    return this.catalogService.archiveTemplate(request);
  }

  @GrpcMethod('CatalogService', 'CreateMaterial')
  createMaterial(request: CreateMaterialRequest): Promise<MaterialResponse> {
    return this.catalogService.createMaterial(request);
  }

  @GrpcMethod('CatalogService', 'UpdateMaterial')
  updateMaterial(request: UpdateMaterialRequest): Promise<MaterialResponse> {
    return this.catalogService.updateMaterial(request);
  }

  @GrpcMethod('CatalogService', 'CreateVariant')
  createVariant(
    request: CreateVariantRequest,
  ): Promise<TemplateVariantResponse> {
    return this.catalogService.createVariant(request);
  }

  @GrpcMethod('CatalogService', 'UpdateVariant')
  updateVariant(
    request: UpdateVariantRequest,
  ): Promise<TemplateVariantResponse> {
    return this.catalogService.updateVariant(request);
  }

  @GrpcMethod('CatalogService', 'CreateGemstoneOption')
  createGemstoneOption(
    request: CreateGemstoneOptionRequest,
  ): Promise<GemstoneOptionResponse> {
    return this.catalogService.createGemstoneOption(request);
  }

  @GrpcMethod('CatalogService', 'UpdateCompatibilities')
  updateCompatibilities(
    request: UpdateCompatibilitiesRequest,
  ): Promise<UpdateCompatibilitiesResponse> {
    return this.catalogService.updateCompatibilities(request);
  }

  @GrpcMethod('CatalogService', 'GetResizePolicies')
  getResizePolicies(
    request: GetResizePoliciesRequest,
  ): Promise<ResizePoliciesResponse> {
    return this.catalogService.getResizePolicies(request);
  }

  @GrpcMethod('CatalogService', 'UpdateResizePolicies')
  updateResizePolicies(
    request: UpdateResizePoliciesRequest,
  ): Promise<ResizePoliciesResponse> {
    return this.catalogService.updateResizePolicies(request);
  }
}
