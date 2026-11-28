import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateMaterialRequest,
  ListMaterialsRequest,
  ListMaterialsResponse,
  MaterialResponse,
  UpdateMaterialRequest,
} from '@app/contracts';
import { toMaterialResponse } from './catalog.mapper';
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from './catalog.repository';

@Injectable()
export class ListMaterialsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  async execute(request: ListMaterialsRequest): Promise<ListMaterialsResponse> {
    const status = request.status ?? 'ACTIVE';
    const rows = await this.repository.findManyMaterials(status);
    return {
      data: rows.map((m) => toMaterialResponse(m)),
    };
  }
}

@Injectable()
export class CreateMaterialUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  async execute(request: CreateMaterialRequest): Promise<MaterialResponse> {
    const existing = await this.repository.findMaterialByCode(request.code);
    if (existing) {
      throw new ConflictException(
        `Material with code '${request.code}' already exists`,
      );
    }

    const created = await this.repository.createMaterial({
      code: request.code,
      name: request.name,
      materialFamily: request.materialFamily,
      purityPercent: request.purityPercent,
      color: request.color,
      status: 'ACTIVE',
    });

    return toMaterialResponse(created);
  }
}

@Injectable()
export class UpdateMaterialUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  async execute(request: UpdateMaterialRequest): Promise<MaterialResponse> {
    const existing = await this.repository.findMaterialById(request.materialId);
    if (!existing) {
      throw new NotFoundException(
        `Material with ID '${request.materialId}' not found`,
      );
    }

    const updated = await this.repository.updateMaterial(request.materialId, {
      ...(request.name !== undefined ? { name: request.name } : {}),
      ...(request.materialFamily !== undefined
        ? { materialFamily: request.materialFamily }
        : {}),
      ...(request.purityPercent !== undefined
        ? { purityPercent: request.purityPercent }
        : {}),
      ...(request.color !== undefined ? { color: request.color } : {}),
      ...(request.status !== undefined ? { status: request.status } : {}),
    });

    return toMaterialResponse(updated);
  }
}
