import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  AdjustInventoryRequest,
  AllocateInventoryRequest,
  AllocationResponse,
  CertifiedGemstoneResponse,
  ConsumeInventoryRequest,
  CreateCertifiedGemstoneRequest,
  HoldInventoryRequest,
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
  ReleaseInventoryRequest,
  ReserveInventoryRequest,
  StockLotResponse,
} from '@app/contracts';
import { InventoryService } from '../application/inventory.service';
import { CommerceInternalGrpcAuthGuard } from '../../../../grpc/commerce-internal-grpc-auth.guard';

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

  @GrpcMethod('InventoryService', 'HoldInventory')
  holdInventory(request: HoldInventoryRequest): Promise<AllocationResponse> {
    return this.inventoryService.holdInventory(request);
  }

  @GrpcMethod('InventoryService', 'ReserveInventory')
  reserveInventory(
    request: ReserveInventoryRequest,
  ): Promise<AllocationResponse> {
    return this.inventoryService.reserveInventory(request);
  }

  @GrpcMethod('InventoryService', 'AllocateInventory')
  allocateInventory(
    request: AllocateInventoryRequest,
  ): Promise<AllocationResponse> {
    return this.inventoryService.allocateInventory(request);
  }

  @GrpcMethod('InventoryService', 'ConsumeInventory')
  consumeInventory(
    request: ConsumeInventoryRequest,
  ): Promise<AllocationResponse> {
    return this.inventoryService.consumeInventory(request);
  }

  @GrpcMethod('InventoryService', 'ReleaseInventory')
  releaseInventory(
    request: ReleaseInventoryRequest,
  ): Promise<AllocationResponse> {
    return this.inventoryService.releaseInventory(request);
  }
}
