import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CATALOG_REPOSITORY } from './catalog.repository';
import {
  GetTemplateByIdUseCase,
  ListTemplatesUseCase,
} from './template-query.use-cases';
import {
  CreateTemplateUseCase,
  PublishTemplateUseCase,
} from './template.use-cases';

describe('Template UseCases', () => {
  let listTemplatesUseCase: ListTemplatesUseCase;
  let getTemplateByIdUseCase: GetTemplateByIdUseCase;
  let createTemplateUseCase: CreateTemplateUseCase;
  let publishTemplateUseCase: PublishTemplateUseCase;

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
        ListTemplatesUseCase,
        GetTemplateByIdUseCase,
        CreateTemplateUseCase,
        PublishTemplateUseCase,
        { provide: CATALOG_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    listTemplatesUseCase =
      module.get<ListTemplatesUseCase>(ListTemplatesUseCase);
    getTemplateByIdUseCase = module.get<GetTemplateByIdUseCase>(
      GetTemplateByIdUseCase,
    );
    createTemplateUseCase = module.get<CreateTemplateUseCase>(
      CreateTemplateUseCase,
    );
    publishTemplateUseCase = module.get<PublishTemplateUseCase>(
      PublishTemplateUseCase,
    );
    jest.clearAllMocks();
  });

  describe('ListTemplatesUseCase', () => {
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

      const result = await listTemplatesUseCase.execute({
        pagination: { page: 1, limit: 10 },
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].templateCode).toBe('T-01');
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('GetTemplateByIdUseCase', () => {
    it('should throw NotFoundException if template does not exist or is inactive', async () => {
      mockRepository.findTemplateById.mockResolvedValue(undefined);

      await expect(
        getTemplateByIdUseCase.execute({ templateId: 'non-existent' }),
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

      const result = await getTemplateByIdUseCase.execute({
        templateId: 'uuid-1',
      });
      expect(result.id).toBe('uuid-1');
      expect(result.name).toBe('Classic Solitaire');
    });
  });

  describe('CreateTemplateUseCase', () => {
    it('should throw ConflictException if template code already exists', async () => {
      mockRepository.findTemplateByCode.mockResolvedValue({ id: 't-1' });

      await expect(
        createTemplateUseCase.execute({
          code: 'T-01',
          name: 'Classic Solitaire',
          glbAssetKey: 'models/t-01.glb',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create template in DRAFT status', async () => {
      mockRepository.findTemplateByCode.mockResolvedValue(undefined);
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

      const res = await createTemplateUseCase.execute({
        code: 'T-NEW',
        name: 'New Ring',
        glbAssetKey: 'models/new.glb',
      });

      expect(res.id).toBe('uuid-created');
      expect(res.status).toBe('DRAFT');
    });
  });

  describe('PublishTemplateUseCase', () => {
    it('should throw BadRequestException if template has no variants', async () => {
      mockRepository.findTemplateById.mockResolvedValue({
        id: 't-1',
        status: 'DRAFT',
      });
      mockRepository.countVariantsForTemplate.mockResolvedValue(0);

      await expect(
        publishTemplateUseCase.execute({ templateId: 't-1' }),
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

      const res = await publishTemplateUseCase.execute({ templateId: 't-1' });
      expect(res.status).toBe('ACTIVE');
    });
  });
});
