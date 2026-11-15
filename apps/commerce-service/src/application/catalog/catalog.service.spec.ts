import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { CatalogService } from './catalog.service';
import { CatalogMapper } from './catalog.mapper';
import { CatalogRepository } from '../../repositories/catalog.repository';

describe('CatalogService', () => {
  let service: CatalogService;

  const mockRepository = {
    findManyTemplates: jest.fn(),
    findTemplateById: jest.fn(),
    findTemplateByCode: jest.fn(),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    countVariantsForTemplate: jest.fn(),
    findManyMaterials: jest.fn(),
    findMaterialById: jest.fn(),
    findMaterialByCode: jest.fn(),
    createMaterial: jest.fn(),
    updateMaterial: jest.fn(),
    findVariantsByTemplateId: jest.fn(),
    findTemplateVariantById: jest.fn(),
    findVariantByTemplateMaterialAndSize: jest.fn(),
    createVariant: jest.fn(),
    updateVariant: jest.fn(),
    findManyGemstoneOptions: jest.fn(),
    findGemstoneOptionById: jest.fn(),
    findGemstoneOptionByCode: jest.fn(),
    createGemstoneOption: jest.fn(),
    findGemstoneSlotsByTemplateId: jest.fn(),
    findCompatibilities: jest.fn(),
    updateCompatibilities: jest.fn(),
    findResizePolicies: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        CatalogMapper,
        {
          provide: CatalogRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    jest.clearAllMocks();
  });

  describe('listTemplates', () => {
    it('should return paginated templates', async () => {
      mockRepository.findManyTemplates.mockResolvedValue({
        rows: [
          {
            id: 'uuid-1',
            code: 'T-01',
            name: 'Classic Solitaire',
            description: 'A classic ring',
            glb_asset_key: 'models/t-01.glb',
            status: 'ACTIVE',
            created_at: new Date('2026-01-01'),
            updated_at: new Date('2026-01-01'),
          },
        ],
        total: 1,
      });

      const result = await service.listTemplates({
        pagination: { page: 1, limit: 10 },
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].templateCode).toBe('T-01');
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getTemplateById', () => {
    it('should throw NotFoundException if template does not exist or is inactive', async () => {
      mockRepository.findTemplateById.mockResolvedValue(null);

      await expect(
        service.getTemplateById({ templateId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return mapped template if active', async () => {
      mockRepository.findTemplateById.mockResolvedValue({
        id: 'uuid-1',
        code: 'T-01',
        name: 'Classic Solitaire',
        description: 'A classic ring',
        glb_asset_key: 'models/t-01.glb',
        status: 'ACTIVE',
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      });

      const result = await service.getTemplateById({ templateId: 'uuid-1' });
      expect(result.id).toBe('uuid-1');
      expect(result.name).toBe('Classic Solitaire');
    });
  });

  describe('validateConfiguration', () => {
    it('should validate resize boundaries and return error when delta exceeded', async () => {
      mockRepository.findTemplateById.mockResolvedValue({
        id: 't-1',
        status: 'ACTIVE',
        design_supported_personalization_packages: ['NONE', 'SOUNDWAVE'],
      });

      mockRepository.findVariantByTemplateMaterialAndSize.mockResolvedValue({
        id: 'v-1',
        standard_size: '12.0',
        max_up_delta: '1.5',
        max_down_delta: '1.0',
        max_safe_engraving_depth_mm: '0.4',
      });

      mockRepository.findGemstoneSlotsByTemplateId.mockResolvedValue([]);

      const result = await service.validateConfiguration({
        templateId: 't-1',
        materialId: 'm-1',
        standardSize: 12.0,
        targetSize: 14.0, // delta is 2.0 > max_up_delta 1.5
        gemstoneSelections: [],
        personalizationPackage: 'NONE',
      });

      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'RESIZE_OUT_OF_BOUNDS' }),
        ]),
      );
    });

    it('should pass validation when configuration is sound', async () => {
      mockRepository.findTemplateById.mockResolvedValue({
        id: 't-1',
        status: 'ACTIVE',
        design_supported_personalization_packages: ['NONE', 'SOUNDWAVE'],
      });

      mockRepository.findVariantByTemplateMaterialAndSize.mockResolvedValue({
        id: 'v-1',
        standard_size: '12.0',
        max_up_delta: '1.5',
        max_down_delta: '1.0',
        max_safe_engraving_depth_mm: '0.4',
      });

      mockRepository.findGemstoneSlotsByTemplateId.mockResolvedValue([]);

      const result = await service.validateConfiguration({
        templateId: 't-1',
        materialId: 'm-1',
        standardSize: 12.0,
        targetSize: 13.0, // delta is 1.0 <= max_up_delta 1.5
        gemstoneSelections: [],
        personalizationPackage: 'SOUNDWAVE',
      });

      expect(result.isValid).toBe(true);
      expect(result.validationErrors).toHaveLength(0);
      expect(result.templateVariantId).toBe('v-1');
    });
  });

  describe('createTemplate', () => {
    it('should throw ConflictException if template code already exists', async () => {
      mockRepository.findTemplateByCode.mockResolvedValue({ id: 't-1' });

      await expect(
        service.createTemplate({
          code: 'T-01',
          name: 'Classic Solitaire',
          glbAssetKey: 'models/t-01.glb',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create template in DRAFT status', async () => {
      mockRepository.findTemplateByCode.mockResolvedValue(null);
      mockRepository.createTemplate.mockResolvedValue({
        id: 'uuid-created',
        code: 'T-NEW',
        name: 'New Ring',
        description: 'New ring desc',
        glb_asset_key: 'models/new.glb',
        status: 'DRAFT',
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      });

      const res = await service.createTemplate({
        code: 'T-NEW',
        name: 'New Ring',
        glbAssetKey: 'models/new.glb',
      });

      expect(res.id).toBe('uuid-created');
      expect(res.status).toBe('DRAFT');
    });
  });

  describe('publishTemplate', () => {
    it('should throw BadRequestException if template has no variants', async () => {
      mockRepository.findTemplateById.mockResolvedValue({
        id: 't-1',
        status: 'DRAFT',
      });
      mockRepository.countVariantsForTemplate.mockResolvedValue(0);

      await expect(
        service.publishTemplate({ templateId: 't-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should publish template when it has at least one variant', async () => {
      mockRepository.findTemplateById.mockResolvedValue({
        id: 't-1',
        status: 'DRAFT',
      });
      mockRepository.countVariantsForTemplate.mockResolvedValue(2);
      mockRepository.updateTemplate.mockResolvedValue({
        id: 't-1',
        code: 'T-01',
        name: 'Ring',
        description: '',
        glb_asset_key: 'models/t-01.glb',
        status: 'ACTIVE',
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      });

      const res = await service.publishTemplate({ templateId: 't-1' });
      expect(res.status).toBe('ACTIVE');
    });
  });

  describe('createVariant', () => {
    it('should throw NotFoundException if template does not exist', async () => {
      mockRepository.findTemplateById.mockResolvedValue(null);

      await expect(
        service.createVariant({
          ringTemplateId: 't-none',
          materialId: 'm-1',
          standardSize: 14.0,
          localWallThicknessMm: 1.8,
          minRemainingWallThicknessMm: 1.2,
          maxSafeEngravingDepthMm: 0.3,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create variant successfully when template and material exist', async () => {
      mockRepository.findTemplateById.mockResolvedValue({ id: 't-1' });
      mockRepository.findMaterialById.mockResolvedValue({ id: 'm-1' });
      mockRepository.createVariant.mockResolvedValue({
        id: 'v-new',
        ring_template_id: 't-1',
        material_id: 'm-1',
        standard_size: new Prisma.Decimal(14.0),
        local_wall_thickness_mm: new Prisma.Decimal(1.8),
        min_remaining_wall_thickness_mm: new Prisma.Decimal(1.2),
        max_safe_engraving_depth_mm: new Prisma.Decimal(0.3),
        status: 'ACTIVE',
        added_metal_allowed: false,
      });

      const res = await service.createVariant({
        ringTemplateId: 't-1',
        materialId: 'm-1',
        standardSize: 14.0,
        localWallThicknessMm: 1.8,
        minRemainingWallThicknessMm: 1.2,
        maxSafeEngravingDepthMm: 0.3,
      });

      expect(res.id).toBe('v-new');
      expect(res.standardSize).toBe(14.0);
    });
  });

  describe('getResizePolicies', () => {
    it('should calculate minSize and maxSize based on standard size and deltas', async () => {
      mockRepository.findResizePolicies.mockResolvedValue([
        {
          id: 'v-1',
          ring_template_id: 't-1',
          standard_size: new Prisma.Decimal(14.0),
          max_up_delta: new Prisma.Decimal(2.0),
          max_down_delta: new Prisma.Decimal(1.5),
          resize_method: 'STRETCH_COMPRESS',
          added_metal_allowed: false,
          local_wall_thickness_mm: new Prisma.Decimal(1.8),
          min_remaining_wall_thickness_mm: new Prisma.Decimal(1.2),
          max_safe_engraving_depth_mm: new Prisma.Decimal(0.3),
          ring_templates: { id: 't-1', name: 'Ring 1', code: 'R1' },
          materials: { id: 'm-1', name: 'Gold 18K' },
        },
      ]);

      const res = await service.getResizePolicies({ templateId: 't-1' });
      expect(res.data).toHaveLength(1);
      expect(res.data[0].standardSize).toBe(14.0);
      expect(res.data[0].minSize).toBe(12.5); // 14 - 1.5
      expect(res.data[0].maxSize).toBe(16.0); // 14 + 2.0
    });
  });
});
