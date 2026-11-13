import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  CatalogServiceHandler,
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
  Template3DAssetsResponse,
  TemplateConfigurationOptionsResponse,
  TemplateResponse,
  ValidateConfigurationRequest,
  ValidateConfigurationResponse,
} from '@app/contracts';
import { CatalogService } from '../../application/catalog/catalog.service';
import { CommerceInternalGrpcAuthGuard } from '../../grpc/commerce-internal-grpc-auth.guard';

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
}
