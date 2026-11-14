import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  AdjustInventoryRequest,
  CertifiedGemstoneResponse,
  CreateCertifiedGemstoneRequest,
  InventoryServiceHandler,
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
import { InventoryService } from '../../application/inventory/inventory.service';
import { CommerceInternalGrpcAuthGuard } from '../../grpc/commerce-internal-grpc-auth.guard';

@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class InventoryGrpcController implements InventoryServiceHandler {
  constructor(private readonly inventoryService: InventoryService) {}

  @GrpcMethod('InventoryService', 'ListRingBlankStocks')
  listRingBlankStocks(
    request: ListRingBlankStocksRequest,
  ): Promise<ListRingBlankStocksResponse> {
    return this.inventoryService.listRingBlankStocks(request);
  }

  @GrpcMethod('InventoryService', 'ReceiveRingBlankStock')
  receiveRingBlankStock(
    request: ReceiveRingBlankStockRequest,
  ): Promise<StockLotResponse> {
    return this.inventoryService.receiveRingBlankStock(request);
  }

  @GrpcMethod('InventoryService', 'ListGemstoneBatches')
  listGemstoneBatches(
    request: ListGemstoneBatchesRequest,
  ): Promise<ListGemstoneBatchesResponse> {
    return this.inventoryService.listGemstoneBatches(request);
  }

  @GrpcMethod('InventoryService', 'ReceiveGemstoneBatch')
  receiveGemstoneBatch(
    request: ReceiveGemstoneBatchRequest,
  ): Promise<StockLotResponse> {
    return this.inventoryService.receiveGemstoneBatch(request);
  }

  @GrpcMethod('InventoryService', 'ListCertifiedGemstoneAvailability')
  listCertifiedGemstoneAvailability(
    request: ListCertifiedGemstoneAvailabilityRequest,
  ): Promise<ListCertifiedGemstoneAvailabilityResponse> {
    return this.inventoryService.listCertifiedGemstoneAvailability(request);
  }

  @GrpcMethod('InventoryService', 'CreateCertifiedGemstone')
  createCertifiedGemstone(
    request: CreateCertifiedGemstoneRequest,
  ): Promise<CertifiedGemstoneResponse> {
    return this.inventoryService.createCertifiedGemstone(request);
  }

  @GrpcMethod('InventoryService', 'ListInventoryMovements')
  listInventoryMovements(
    request: ListInventoryMovementsRequest,
  ): Promise<ListInventoryMovementsResponse> {
    return this.inventoryService.listInventoryMovements(request);
  }

  @GrpcMethod('InventoryService', 'AdjustInventory')
  adjustInventory(request: AdjustInventoryRequest): Promise<StockLotResponse> {
    return this.inventoryService.adjustInventory(request);
  }
}
