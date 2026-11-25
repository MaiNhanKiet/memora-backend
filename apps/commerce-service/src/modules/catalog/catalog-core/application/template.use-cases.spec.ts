import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CATALOG_REPOSITORY } from './catalog.repository';
import { TemplateUseCases } from './template.use-cases';

describe('TemplateUseCases', () => {
  let useCases: TemplateUseCases;

  const mockRepository = {
    findManyTemplates: jest.fn(),
    findTemplateById: jest.fn(),
    findTemplateByCode: jest.fn(),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    countVariantsForTemplate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateUseCases,
        { provide: CATALOG_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    useCases = module.get<TemplateUseCases>(TemplateUseCases);
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
            glbAssetKey: 'models/t-01.glb',
            stoneLayout: 'NONE',
            designSupportedPersonalizationPackages: ['NONE'],
            status: 'ACTIVE',
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
          },
        ],
        total: 1,
      });

      const result = await useCases.listTemplates({
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
        useCases.getTemplateById({ templateId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return mapped template if active', async () => {
      mockRepository.findTemplateById.mockResolvedValue({
        id: 'uuid-1',
        code: 'T-01',
        name: 'Classic Solitaire',
        description: 'A classic ring',
        glbAssetKey: 'models/t-01.glb',
        stoneLayout: 'NONE',
        designSupportedPersonalizationPackages: ['NONE'],
        status: 'ACTIVE',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });

      const result = await useCases.getTemplateById({ templateId: 'uuid-1' });
      expect(result.id).toBe('uuid-1');
      expect(result.name).toBe('Classic Solitaire');
    });
  });

  describe('createTemplate', () => {
    it('should throw ConflictException if template code already exists', async () => {
      mockRepository.findTemplateByCode.mockResolvedValue({ id: 't-1' });

      await expect(
        useCases.createTemplate({
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
        glbAssetKey: 'models/new.glb',
        stoneLayout: 'NONE',
        designSupportedPersonalizationPackages: ['NONE'],
        status: 'DRAFT',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });

      const res = await useCases.createTemplate({
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
        useCases.publishTemplate({ templateId: 't-1' }),
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
        glbAssetKey: 'models/t-01.glb',
        stoneLayout: 'NONE',
        designSupportedPersonalizationPackages: ['NONE'],
        status: 'ACTIVE',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });

      const res = await useCases.publishTemplate({ templateId: 't-1' });
      expect(res.status).toBe('ACTIVE');
    });
  });
});
