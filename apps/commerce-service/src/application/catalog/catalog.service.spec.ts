import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogMapper } from './catalog.mapper';
import { CatalogRepository } from '../../repositories/catalog.repository';

describe('CatalogService', () => {
  let service: CatalogService;

  const mockRepository = {
    findManyTemplates: jest.fn(),
    findTemplateById: jest.fn(),
    findManyMaterials: jest.fn(),
    findVariantsByTemplateId: jest.fn(),
    findVariantByTemplateMaterialAndSize: jest.fn(),
    findManyGemstoneOptions: jest.fn(),
    findGemstoneSlotsByTemplateId: jest.fn(),
    findCompatibilities: jest.fn(),
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
});
