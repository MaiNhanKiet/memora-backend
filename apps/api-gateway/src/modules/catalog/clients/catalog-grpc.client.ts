import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import type {
  ArchiveTemplateRequest,
  CatalogServiceClient,
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
import { DomainGrpcClient } from '../../../common/grpc/domain-grpc';

export const COMMERCE_CATALOG_GRPC_CLIENT = 'COMMERCE_CATALOG_GRPC_CLIENT';

@Injectable()
export class CatalogGrpcClient
  extends DomainGrpcClient
  implements OnModuleInit
{
  private catalogService!: CatalogServiceClient;

  constructor(
    @Inject(COMMERCE_CATALOG_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
    configService: ConfigService,
  ) {
    super(configService, 'apiGateway.commerceInternalGrpcSecret', {
      optional: true,
    });
  }

  onModuleInit(): void {
    this.catalogService =
      this.grpcClient.getService<CatalogServiceClient>('CatalogService');
  }

  listTemplates(request: ListTemplatesRequest): Promise<ListTemplatesResponse> {
    return this.unary((metadata) =>
      this.catalogService.listTemplates(request, metadata),
    );
  }

  getTemplateById(request: GetTemplateByIdRequest): Promise<TemplateResponse> {
    return this.unary((metadata) =>
      this.catalogService.getTemplateById(request, metadata),
    );
  }

  getTemplateConfigurationOptions(
    request: GetTemplateConfigurationOptionsRequest,
  ): Promise<TemplateConfigurationOptionsResponse> {
    return this.unary((metadata) =>
      this.catalogService.getTemplateConfigurationOptions(request, metadata),
    );
  }

  getTemplate3DAssets(
    request: GetTemplate3DAssetsRequest,
  ): Promise<Template3DAssetsResponse> {
    return this.unary((metadata) =>
      this.catalogService.getTemplate3DAssets(request, metadata),
    );
  }

  listMaterials(request: ListMaterialsRequest): Promise<ListMaterialsResponse> {
    return this.unary((metadata) =>
      this.catalogService.listMaterials(request, metadata),
    );
  }

  listTemplateVariants(
    request: ListTemplateVariantsRequest,
  ): Promise<ListTemplateVariantsResponse> {
    return this.unary((metadata) =>
      this.catalogService.listTemplateVariants(request, metadata),
    );
  }

  listGemstoneOptions(
    request: ListGemstoneOptionsRequest,
  ): Promise<ListGemstoneOptionsResponse> {
    return this.unary((metadata) =>
      this.catalogService.listGemstoneOptions(request, metadata),
    );
  }

  listGemstoneSlots(
    request: ListGemstoneSlotsRequest,
  ): Promise<ListGemstoneSlotsResponse> {
    return this.unary((metadata) =>
      this.catalogService.listGemstoneSlots(request, metadata),
    );
  }

  validateConfiguration(
    request: ValidateConfigurationRequest,
  ): Promise<ValidateConfigurationResponse> {
    return this.unary((metadata) =>
      this.catalogService.validateConfiguration(request, metadata),
    );
  }

  // Admin APIs
  createTemplate(request: CreateTemplateRequest): Promise<TemplateResponse> {
    return this.unary((metadata) =>
      this.catalogService.createTemplate(request, metadata),
    );
  }

  updateTemplate(request: UpdateTemplateRequest): Promise<TemplateResponse> {
    return this.unary((metadata) =>
      this.catalogService.updateTemplate(request, metadata),
    );
  }

  publishTemplate(request: PublishTemplateRequest): Promise<TemplateResponse> {
    return this.unary((metadata) =>
      this.catalogService.publishTemplate(request, metadata),
    );
  }

  archiveTemplate(request: ArchiveTemplateRequest): Promise<TemplateResponse> {
    return this.unary((metadata) =>
      this.catalogService.archiveTemplate(request, metadata),
    );
  }

  createMaterial(request: CreateMaterialRequest): Promise<MaterialResponse> {
    return this.unary((metadata) =>
      this.catalogService.createMaterial(request, metadata),
    );
  }

  updateMaterial(request: UpdateMaterialRequest): Promise<MaterialResponse> {
    return this.unary((metadata) =>
      this.catalogService.updateMaterial(request, metadata),
    );
  }

  createVariant(
    request: CreateVariantRequest,
  ): Promise<TemplateVariantResponse> {
    return this.unary((metadata) =>
      this.catalogService.createVariant(request, metadata),
    );
  }

  updateVariant(
    request: UpdateVariantRequest,
  ): Promise<TemplateVariantResponse> {
    return this.unary((metadata) =>
      this.catalogService.updateVariant(request, metadata),
    );
  }

  createGemstoneOption(
    request: CreateGemstoneOptionRequest,
  ): Promise<GemstoneOptionResponse> {
    return this.unary((metadata) =>
      this.catalogService.createGemstoneOption(request, metadata),
    );
  }

  updateCompatibilities(
    request: UpdateCompatibilitiesRequest,
  ): Promise<UpdateCompatibilitiesResponse> {
    return this.unary((metadata) =>
      this.catalogService.updateCompatibilities(request, metadata),
    );
  }

  getResizePolicies(
    request: GetResizePoliciesRequest,
  ): Promise<ResizePoliciesResponse> {
    return this.unary((metadata) =>
      this.catalogService.getResizePolicies(request, metadata),
    );
  }

  updateResizePolicies(
    request: UpdateResizePoliciesRequest,
  ): Promise<ResizePoliciesResponse> {
    return this.unary((metadata) =>
      this.catalogService.updateResizePolicies(request, metadata),
    );
  }
}
