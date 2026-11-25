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
import { CommerceInternalGrpcAuthGuard } from '../../../../grpc/commerce-internal-grpc-auth.guard';
import {
  AllocateInventoryUseCase,
  ConsumeInventoryUseCase,
  HoldInventoryUseCase,
  ReleaseInventoryUseCase,
  ReserveInventoryUseCase,
} from '../application/allocation.use-cases';
import {
  CreateCertifiedGemstoneUseCase,
  ListCertifiedGemstoneAvailabilityUseCase,
} from '../application/certified-gemstone.use-cases';
import {
  AdjustInventoryUseCase,
  ListGemstoneBatchesUseCase,
  ListInventoryMovementsUseCase,
  ListRingBlankStocksUseCase,
  ReceiveGemstoneBatchUseCase,
  ReceiveRingBlankStockUseCase,
} from '../application/stock-lot.use-cases';

/** Thin gRPC adapter. Inventory invariants and actor enforcement live in the use cases. */
@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class InventoryGrpcController implements InventoryServiceHandler {
  constructor(
    private readonly listRingBlankStocksUseCase: ListRingBlankStocksUseCase,
    private readonly receiveRingBlankStockUseCase: ReceiveRingBlankStockUseCase,
    private readonly listGemstoneBatchesUseCase: ListGemstoneBatchesUseCase,
    private readonly receiveGemstoneBatchUseCase: ReceiveGemstoneBatchUseCase,
    private readonly listCertifiedGemstoneAvailabilityUseCase: ListCertifiedGemstoneAvailabilityUseCase,
    private readonly createCertifiedGemstoneUseCase: CreateCertifiedGemstoneUseCase,
    private readonly listInventoryMovementsUseCase: ListInventoryMovementsUseCase,
    private readonly adjustInventoryUseCase: AdjustInventoryUseCase,
    private readonly holdInventoryUseCase: HoldInventoryUseCase,
    private readonly reserveInventoryUseCase: ReserveInventoryUseCase,
    private readonly allocateInventoryUseCase: AllocateInventoryUseCase,
    private readonly consumeInventoryUseCase: ConsumeInventoryUseCase,
    private readonly releaseInventoryUseCase: ReleaseInventoryUseCase,
  ) {}

  @GrpcMethod('InventoryService', 'ListRingBlankStocks')
  listRingBlankStocks(
    request: ListRingBlankStocksRequest,
  ): Promise<ListRingBlankStocksResponse> {
    return this.listRingBlankStocksUseCase.execute(request);
  }

  @GrpcMethod('InventoryService', 'ReceiveRingBlankStock')
  receiveRingBlankStock(
    request: ReceiveRingBlankStockRequest,
  ): Promise<StockLotResponse> {
    return this.receiveRingBlankStockUseCase.execute(request);
  }

  @GrpcMethod('InventoryService', 'ListGemstoneBatches')
  listGemstoneBatches(
    request: ListGemstoneBatchesRequest,
  ): Promise<ListGemstoneBatchesResponse> {
    return this.listGemstoneBatchesUseCase.execute(request);
  }

  @GrpcMethod('InventoryService', 'ReceiveGemstoneBatch')
  receiveGemstoneBatch(
    request: ReceiveGemstoneBatchRequest,
  ): Promise<StockLotResponse> {
    return this.receiveGemstoneBatchUseCase.execute(request);
  }

  @GrpcMethod('InventoryService', 'ListCertifiedGemstoneAvailability')
  listCertifiedGemstoneAvailability(
    request: ListCertifiedGemstoneAvailabilityRequest,
  ): Promise<ListCertifiedGemstoneAvailabilityResponse> {
    return this.listCertifiedGemstoneAvailabilityUseCase.execute(request);
  }

  @GrpcMethod('InventoryService', 'CreateCertifiedGemstone')
  createCertifiedGemstone(
    request: CreateCertifiedGemstoneRequest,
  ): Promise<CertifiedGemstoneResponse> {
    return this.createCertifiedGemstoneUseCase.execute(request);
  }

  @GrpcMethod('InventoryService', 'ListInventoryMovements')
  listInventoryMovements(
    request: ListInventoryMovementsRequest,
  ): Promise<ListInventoryMovementsResponse> {
    return this.listInventoryMovementsUseCase.execute(request);
  }

  @GrpcMethod('InventoryService', 'AdjustInventory')
  adjustInventory(request: AdjustInventoryRequest): Promise<StockLotResponse> {
    return this.adjustInventoryUseCase.execute(request);
  }

  @GrpcMethod('InventoryService', 'HoldInventory')
  holdInventory(request: HoldInventoryRequest): Promise<AllocationResponse> {
    return this.holdInventoryUseCase.execute(request);
  }

  @GrpcMethod('InventoryService', 'ReserveInventory')
  reserveInventory(
    request: ReserveInventoryRequest,
  ): Promise<AllocationResponse> {
    return this.reserveInventoryUseCase.execute(request);
  }

  @GrpcMethod('InventoryService', 'AllocateInventory')
  allocateInventory(
    request: AllocateInventoryRequest,
  ): Promise<AllocationResponse> {
    return this.allocateInventoryUseCase.execute(request);
  }

  @GrpcMethod('InventoryService', 'ConsumeInventory')
  consumeInventory(
    request: ConsumeInventoryRequest,
  ): Promise<AllocationResponse> {
    return this.consumeInventoryUseCase.execute(request);
  }

  @GrpcMethod('InventoryService', 'ReleaseInventory')
  releaseInventory(
    request: ReleaseInventoryRequest,
  ): Promise<AllocationResponse> {
    return this.releaseInventoryUseCase.execute(request);
  }
}
