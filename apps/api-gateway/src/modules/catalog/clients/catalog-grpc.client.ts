import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import {
  INTERNAL_GRPC_AUTH_METADATA_KEY,
  mapGrpcErrorToHttpException,
} from '@app/common';
import type {
  GetConfigurationOptionsRequest,
  GetConfigurationOptionsResponse,
  GetRingTemplateDetailRequest,
  GetRingTemplateDetailResponse,
  GetTemplate3DAssetsRequest,
  GetTemplate3DAssetsResponse,
  ListRingTemplatesRequest,
  ListRingTemplatesResponse,
} from '@app/contracts';
import { createOutgoingGrpcMetadata } from '@app/logger';
import type { Metadata } from '@grpc/grpc-js';
import { Observable, firstValueFrom, timeout } from 'rxjs';

export const CATALOG_GRPC_CLIENT = 'CATALOG_GRPC_CLIENT';
const CATALOG_RPC_TIMEOUT_MS = 5000;

interface CatalogServiceClient {
  listRingTemplates(
    request: ListRingTemplatesRequest,
    metadata?: Metadata,
  ): Observable<ListRingTemplatesResponse>;
  getRingTemplateDetail(
    request: GetRingTemplateDetailRequest,
    metadata?: Metadata,
  ): Observable<GetRingTemplateDetailResponse>;
  getConfigurationOptions(
    request: GetConfigurationOptionsRequest,
    metadata?: Metadata,
  ): Observable<GetConfigurationOptionsResponse>;
  getTemplate3DAssets(
    request: GetTemplate3DAssetsRequest,
    metadata?: Metadata,
  ): Observable<GetTemplate3DAssetsResponse>;
}

@Injectable()
export class CatalogGrpcClient implements OnModuleInit {
  private client!: CatalogServiceClient;

  constructor(
    @Inject(CATALOG_GRPC_CLIENT) private readonly grpcClient: ClientGrpc,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.client =
      this.grpcClient.getService<CatalogServiceClient>('CatalogService');
  }

  async listRingTemplates(
    request: ListRingTemplatesRequest,
  ): Promise<ListRingTemplatesResponse> {
    return this.invoke((client, metadata) =>
      client.listRingTemplates(request, metadata),
    );
  }

  async getRingTemplateDetail(
    templateId: string,
  ): Promise<GetRingTemplateDetailResponse> {
    return this.invoke((client, metadata) =>
      client.getRingTemplateDetail({ templateId }, metadata),
    );
  }

  async getConfigurationOptions(
    templateId: string,
  ): Promise<GetConfigurationOptionsResponse> {
    return this.invoke((client, metadata) =>
      client.getConfigurationOptions({ templateId }, metadata),
    );
  }

  async getTemplate3DAssets(
    templateId: string,
  ): Promise<GetTemplate3DAssetsResponse> {
    return this.invoke((client, metadata) =>
      client.getTemplate3DAssets({ templateId }, metadata),
    );
  }


  private async invoke<T>(
    call: (client: CatalogServiceClient, metadata: Metadata) => Observable<T>,
  ): Promise<T> {
    const metadata = createOutgoingGrpcMetadata();
    const internalSecret =
      this.config.get<string>('apiGateway.internalGrpcSecret') ??
      process.env.COMMERCE_INTERNAL_GRPC_SECRET ??
      process.env.IAM_INTERNAL_GRPC_SECRET ??
      'replace-with-a-long-random-internal-secret';

    metadata.set(INTERNAL_GRPC_AUTH_METADATA_KEY, internalSecret);

    try {
      return await firstValueFrom(
        call(this.client, metadata).pipe(timeout(CATALOG_RPC_TIMEOUT_MS)),
      );
    } catch (error) {
      throw mapGrpcErrorToHttpException(error);
    }
  }
}
