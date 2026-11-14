import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import type {
  AdjustInventoryRequest,
  CertifiedGemstoneResponse,
  CreateCertifiedGemstoneRequest,
  InventoryServiceClient,
  ListCertifiedGemstoneAvailabilityRequest,
  ListCertifiedGemstoneAvailabilityResponse,
  ListGemstoneBatchesRequest,
  ListGemstoneBatchesResponse,
  ListInventoryMovementsRequest,
  ListInventoryMovementsResponse,
  ListRingBlankStocksRequest,
  ListRingBlankStocksResponse,
  ReceiveGemstoneBatchRequest,
  ReceiveRingBlankStockRequest,
  StockLotResponse,
} from '@app/contracts';
import { DomainGrpcClient } from '../../../common/grpc/domain-grpc';

export const COMMERCE_INVENTORY_GRPC_CLIENT = 'COMMERCE_INVENTORY_GRPC_CLIENT';

@Injectable()
export class InventoryGrpcClient
  extends DomainGrpcClient
  implements OnModuleInit
{
  private inventoryService!: InventoryServiceClient;

  constructor(
    @Inject(COMMERCE_INVENTORY_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
    configService: ConfigService,
  ) {
    super(configService, 'apiGateway.commerceInternalGrpcSecret');
  }

  onModuleInit(): void {
    this.inventoryService =
      this.grpcClient.getService<InventoryServiceClient>('InventoryService');
  }

  listRingBlankStocks(
    request: ListRingBlankStocksRequest,
  ): Promise<ListRingBlankStocksResponse> {
    return this.unary((metadata) =>
      this.inventoryService.listRingBlankStocks(request, metadata),
    );
  }

  receiveRingBlankStock(
    request: ReceiveRingBlankStockRequest,
  ): Promise<StockLotResponse> {
    return this.unary((metadata) =>
      this.inventoryService.receiveRingBlankStock(request, metadata),
    );
  }

  listGemstoneBatches(
    request: ListGemstoneBatchesRequest,
  ): Promise<ListGemstoneBatchesResponse> {
    return this.unary((metadata) =>
      this.inventoryService.listGemstoneBatches(request, metadata),
    );
  }

  receiveGemstoneBatch(
    request: ReceiveGemstoneBatchRequest,
  ): Promise<StockLotResponse> {
    return this.unary((metadata) =>
      this.inventoryService.receiveGemstoneBatch(request, metadata),
    );
  }

  listCertifiedGemstoneAvailability(
    request: ListCertifiedGemstoneAvailabilityRequest,
  ): Promise<ListCertifiedGemstoneAvailabilityResponse> {
    return this.unary((metadata) =>
      this.inventoryService.listCertifiedGemstoneAvailability(
        request,
        metadata,
      ),
    );
  }

  createCertifiedGemstone(
    request: CreateCertifiedGemstoneRequest,
  ): Promise<CertifiedGemstoneResponse> {
    return this.unary((metadata) =>
      this.inventoryService.createCertifiedGemstone(request, metadata),
    );
  }

  listInventoryMovements(
    request: ListInventoryMovementsRequest,
  ): Promise<ListInventoryMovementsResponse> {
    return this.unary((metadata) =>
      this.inventoryService.listInventoryMovements(request, metadata),
    );
  }

  adjustInventory(request: AdjustInventoryRequest): Promise<StockLotResponse> {
    return this.unary((metadata) =>
      this.inventoryService.adjustInventory(request, metadata),
    );
  }
}
