import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CATALOG_REPOSITORY } from './catalog.repository';
import { GetResizePoliciesUseCase } from './resize-policy.use-cases';
import { validateGemstoneSlotSelections } from './gemstone-selection.validation';
import { ValidateConfigurationUseCase } from './validate-configuration.use-case';
import { CreateVariantUseCase } from './variant.use-cases';

describe('Catalog validation, variants & resize policies', () => {
  let validateUseCase: ValidateConfigurationUseCase;
  let createVariantUseCase: CreateVariantUseCase;
  let getResizePoliciesUseCase: GetResizePoliciesUseCase;

  const mockRepository = {
    findTemplateById: jest.fn(),
    findMaterialById: jest.fn(),
    findVariantByTemplateMaterialAndSize: jest.fn(),
    findGemstoneSlotsByTemplateId: jest.fn(),
    findCompatibilities: jest.fn(),
    createVariant: jest.fn(),
    findResizePolicies: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateConfigurationUseCase,
        CreateVariantUseCase,
        GetResizePoliciesUseCase,
        { provide: CATALOG_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    validateUseCase = module.get<ValidateConfigurationUseCase>(
      ValidateConfigurationUseCase,
    );
    createVariantUseCase =
      module.get<CreateVariantUseCase>(CreateVariantUseCase);
    getResizePoliciesUseCase = module.get<GetResizePoliciesUseCase>(
      GetResizePoliciesUseCase,
    );
    jest.clearAllMocks();
  });

  describe('ValidateConfigurationUseCase', () => {
    it('should validate resize boundaries and return error when delta exceeded', async () => {
      mockRepository.findTemplateById.mockResolvedValue({
        id: 't-1',
        status: 'ACTIVE',
        designSupportedPersonalizationPackages: ['NONE', 'SOUNDWAVE'],
      });

      mockRepository.findVariantByTemplateMaterialAndSize.mockResolvedValue({
        id: 'v-1',
        standardSize: 12.0,
        maxUpDelta: 1.5,
        maxDownDelta: 1.0,
        maxSafeEngravingDepthMm: 0.4,
      });

      mockRepository.findGemstoneSlotsByTemplateId.mockResolvedValue([]);

      const result = await validateUseCase.execute({
        templateId: 't-1',
        materialId: 'm-1',
        standardSize: 12.0,
        targetSize: 14.0,
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
        designSupportedPersonalizationPackages: ['NONE', 'SOUNDWAVE'],
      });

      mockRepository.findVariantByTemplateMaterialAndSize.mockResolvedValue({
        id: 'v-1',
        standardSize: 12.0,
        maxUpDelta: 1.5,
        maxDownDelta: 1.0,
        maxSafeEngravingDepthMm: 0.4,
      });

      mockRepository.findGemstoneSlotsByTemplateId.mockResolvedValue([]);

      const result = await validateUseCase.execute({
        templateId: 't-1',
        materialId: 'm-1',
        standardSize: 12.0,
        targetSize: 13.0,
        gemstoneSelections: [],
        personalizationPackage: 'SOUNDWAVE',
      });

      expect(result.isValid).toBe(true);
      expect(result.validationErrors).toHaveLength(0);
      expect(result.templateVariantId).toBe('v-1');
    });
  });

  describe('gemstone configuration', () => {
    it.each([
      { compatibilities: [] },
      {
        compatibilities: [
          { gemstoneOptionId: 'option-1', gemstoneGroupId: 'wrong-group' },
        ],
      },
    ])(
      'rejects a stone unless its option is compatible with the selected slot group',
      ({ compatibilities }) => {
        const result = validateGemstoneSlotSelections(
          [
            {
              id: 'slot-1',
              slotIndex: 1,
              gemstoneGroupId: 'group-1',
              isRequired: true,
            },
          ],
          compatibilities,
          [{ gemstoneOptionId: 'option-1', slotNumber: 1 }],
        );
        expect(result.errors.map(({ code }) => code)).toEqual([
          'GEMSTONE_INCOMPATIBLE',
          'REQUIRED_SLOT_EMPTY',
        ]);
      },
    );

    it('rejects repeated physical slots and accepts a valid selection', () => {
      const slots = [
        {
          id: 'slot-1',
          slotIndex: 1,
          gemstoneGroupId: 'group-1',
          isRequired: true,
        },
      ];
      const options = [
        { gemstoneGroupId: 'group-1', gemstoneOptionId: 'option-1' },
      ];
      const selection = { gemstoneOptionId: 'option-1', slotNumber: 1 };
      expect(
        validateGemstoneSlotSelections(slots, options, [selection]),
      ).toEqual({ slotIds: ['slot-1'], errors: [] });
      expect(
        validateGemstoneSlotSelections(slots, options, [selection, selection])
          .errors,
      ).toHaveLength(1);
    });
  });

  describe('CreateVariantUseCase', () => {
    it('should throw NotFoundException if template does not exist', async () => {
      mockRepository.findTemplateById.mockResolvedValue(undefined);

      await expect(
        createVariantUseCase.execute({
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
        ringTemplateId: 't-1',
        materialId: 'm-1',
        standardSize: 14.0,
        localWallThicknessMm: 1.8,
        minRemainingWallThicknessMm: 1.2,
        maxSafeEngravingDepthMm: 0.3,
        status: 'ACTIVE',
        addedMetalAllowed: false,
      });

      const res = await createVariantUseCase.execute({
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

  describe('GetResizePoliciesUseCase', () => {
    it('should calculate minSize and maxSize based on standard size and deltas', async () => {
      mockRepository.findResizePolicies.mockResolvedValue([
        {
          id: 'v-1',
          ringTemplateId: 't-1',
          materialId: 'm-1',
          standardSize: 14.0,
          maxUpDelta: 2.0,
          maxDownDelta: 1.5,
          resizeMethod: 'STRETCH_COMPRESS',
          addedMetalAllowed: false,
          localWallThicknessMm: 1.8,
          minRemainingWallThicknessMm: 1.2,
          maxSafeEngravingDepthMm: 0.3,
          status: 'ACTIVE',
          templateName: 'Ring 1',
          materialName: 'Gold 18K',
        },
      ]);

      const res = await getResizePoliciesUseCase.execute({
        templateId: 't-1',
      });
      expect(res.data).toHaveLength(1);
      expect(res.data[0].standardSize).toBe(14.0);
      expect(res.data[0].minSize).toBe(12.5);
      expect(res.data[0].maxSize).toBe(16.0);
    });
  });
});
