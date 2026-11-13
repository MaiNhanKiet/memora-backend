import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import type {
  CatalogServiceClient,
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
    super(configService, 'apiGateway.commerceInternalGrpcSecret');
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
}
