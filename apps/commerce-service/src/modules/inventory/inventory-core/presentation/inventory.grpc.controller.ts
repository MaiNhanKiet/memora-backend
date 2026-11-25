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
import { AllocationUseCases } from '../application/allocation.use-cases';
import { CertifiedGemstoneUseCases } from '../application/certified-gemstone.use-cases';
import { StockLotUseCases } from '../application/stock-lot.use-cases';
import { CommerceInternalGrpcAuthGuard } from '../../../../grpc/commerce-internal-grpc-auth.guard';

@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class InventoryGrpcController implements InventoryServiceHandler {
  constructor(
    private readonly stockLotUseCases: StockLotUseCases,
    private readonly certifiedGemstoneUseCases: CertifiedGemstoneUseCases,
    private readonly allocationUseCases: AllocationUseCases,
  ) {}

  @GrpcMethod('InventoryService', 'ListRingBlankStocks')
  listRingBlankStocks(
    request: ListRingBlankStocksRequest,
  ): Promise<ListRingBlankStocksResponse> {
    return this.stockLotUseCases.listRingBlankStocks(request);
  }

  @GrpcMethod('InventoryService', 'ReceiveRingBlankStock')
  receiveRingBlankStock(
    request: ReceiveRingBlankStockRequest,
  ): Promise<StockLotResponse> {
    return this.stockLotUseCases.receiveRingBlankStock(request);
  }

  @GrpcMethod('InventoryService', 'ListGemstoneBatches')
  listGemstoneBatches(
    request: ListGemstoneBatchesRequest,
  ): Promise<ListGemstoneBatchesResponse> {
    return this.stockLotUseCases.listGemstoneBatches(request);
  }

  @GrpcMethod('InventoryService', 'ReceiveGemstoneBatch')
  receiveGemstoneBatch(
    request: ReceiveGemstoneBatchRequest,
  ): Promise<StockLotResponse> {
    return this.stockLotUseCases.receiveGemstoneBatch(request);
  }

  @GrpcMethod('InventoryService', 'ListCertifiedGemstoneAvailability')
  listCertifiedGemstoneAvailability(
    request: ListCertifiedGemstoneAvailabilityRequest,
  ): Promise<ListCertifiedGemstoneAvailabilityResponse> {
    return this.certifiedGemstoneUseCases.listCertifiedGemstoneAvailability(
      request,
    );
  }

  @GrpcMethod('InventoryService', 'CreateCertifiedGemstone')
  createCertifiedGemstone(
    request: CreateCertifiedGemstoneRequest,
  ): Promise<CertifiedGemstoneResponse> {
    return this.certifiedGemstoneUseCases.createCertifiedGemstone(request);
  }

  @GrpcMethod('InventoryService', 'ListInventoryMovements')
  listInventoryMovements(
    request: ListInventoryMovementsRequest,
  ): Promise<ListInventoryMovementsResponse> {
    return this.stockLotUseCases.listInventoryMovements(request);
  }

  @GrpcMethod('InventoryService', 'AdjustInventory')
  adjustInventory(request: AdjustInventoryRequest): Promise<StockLotResponse> {
    return this.stockLotUseCases.adjustInventory(request);
  }

  @GrpcMethod('InventoryService', 'HoldInventory')
  holdInventory(request: HoldInventoryRequest): Promise<AllocationResponse> {
    return this.allocationUseCases.holdInventory(request);
  }

  @GrpcMethod('InventoryService', 'ReserveInventory')
  reserveInventory(
    request: ReserveInventoryRequest,
  ): Promise<AllocationResponse> {
    return this.allocationUseCases.reserveInventory(request);
  }

  @GrpcMethod('InventoryService', 'AllocateInventory')
  allocateInventory(
    request: AllocateInventoryRequest,
  ): Promise<AllocationResponse> {
    return this.allocationUseCases.allocateInventory(request);
  }

  @GrpcMethod('InventoryService', 'ConsumeInventory')
  consumeInventory(
    request: ConsumeInventoryRequest,
  ): Promise<AllocationResponse> {
    return this.allocationUseCases.consumeInventory(request);
  }

  @GrpcMethod('InventoryService', 'ReleaseInventory')
  releaseInventory(
    request: ReleaseInventoryRequest,
  ): Promise<AllocationResponse> {
    return this.allocationUseCases.releaseInventory(request);
  }
}
