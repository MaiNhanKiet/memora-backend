import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstimatePriceUseCase } from './estimate-price.use-case';
import {
  CreatePriceItemUseCase,
  ListPriceItemsUseCase,
} from './price-item.use-cases';
import {
  ApprovePriceVersionUseCase,
  CreatePriceVersionUseCase,
  RejectPriceVersionUseCase,
} from './price-version.use-cases';
import {
  ActivatePricingRuleUseCase,
  CreatePricingRuleUseCase,
} from './pricing-rule.use-cases';
import { PRICING_REPOSITORY } from './pricing.repository';

describe('Pricing Use Cases', () => {
  let estimateUseCase: EstimatePriceUseCase;
  let listPriceItemsUseCase: ListPriceItemsUseCase;
  let createPriceItemUseCase: CreatePriceItemUseCase;
  let createPriceVersionUseCase: CreatePriceVersionUseCase;
  let approvePriceVersionUseCase: ApprovePriceVersionUseCase;
  let rejectPriceVersionUseCase: RejectPriceVersionUseCase;
  let createPricingRuleUseCase: CreatePricingRuleUseCase;
  let activatePricingRuleUseCase: ActivatePricingRuleUseCase;

  const mockRepository = {
    findVariantById: jest.fn(),
    findActivePriceVersionByVariantId: jest.fn(),
    findActivePriceVersionsByGemstoneOptionIds: jest.fn(),
    findActivePriceVersionByPersonalizationPackage: jest.fn(),
    findActivePriceVersionByMaintenancePlan: jest.fn(),
    findActiveResizeRule: jest.fn(),
    findPriceItems: jest.fn(),
    findPriceItemById: jest.fn(),
    findPriceItemByCode: jest.fn(),
    createPriceItem: jest.fn(),
    findPriceVersions: jest.fn(),
    getLatestVersionNoForPriceItem: jest.fn(),
    createPriceVersion: jest.fn(),
    approvePriceVersion: jest.fn(),
    rejectPriceVersion: jest.fn(),
    findPricingRules: jest.fn(),
    getLatestVersionNoForPricingRule: jest.fn(),
    createPricingRule: jest.fn(),
    activatePricingRule: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstimatePriceUseCase,
        ListPriceItemsUseCase,
        CreatePriceItemUseCase,
        CreatePriceVersionUseCase,
        ApprovePriceVersionUseCase,
        RejectPriceVersionUseCase,
        CreatePricingRuleUseCase,
        ActivatePricingRuleUseCase,
        { provide: PRICING_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    estimateUseCase = module.get<EstimatePriceUseCase>(EstimatePriceUseCase);
    listPriceItemsUseCase = module.get<ListPriceItemsUseCase>(
      ListPriceItemsUseCase,
    );
    createPriceItemUseCase = module.get<CreatePriceItemUseCase>(
      CreatePriceItemUseCase,
    );
    createPriceVersionUseCase = module.get<CreatePriceVersionUseCase>(
      CreatePriceVersionUseCase,
    );
    approvePriceVersionUseCase = module.get<ApprovePriceVersionUseCase>(
      ApprovePriceVersionUseCase,
    );
    rejectPriceVersionUseCase = module.get<RejectPriceVersionUseCase>(
      RejectPriceVersionUseCase,
    );
    createPricingRuleUseCase = module.get<CreatePricingRuleUseCase>(
      CreatePricingRuleUseCase,
    );
    activatePricingRuleUseCase = module.get<ActivatePricingRuleUseCase>(
      ActivatePricingRuleUseCase,
    );
    jest.clearAllMocks();
  });

  describe('EstimatePriceUseCase', () => {
    it('should throw NotFoundException if variant does not exist', async () => {
      mockRepository.findVariantById.mockResolvedValue(undefined);

      await expect(
        estimateUseCase.execute({
          templateVariantId: 'non-existent',
          targetSize: 12.0,
          gemstoneOptionIds: [],
          personalizationPackage: 'NONE',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnprocessableEntityException if targetSize is out of bounds', async () => {
      mockRepository.findVariantById.mockResolvedValue({
        id: 'v-1',
        standardSize: 12.0,
        maxUpDelta: 1.0,
        maxDownDelta: 1.0,
        status: 'ACTIVE',
      });

      await expect(
        estimateUseCase.execute({
          templateVariantId: 'v-1',
          targetSize: 14.0,
          gemstoneOptionIds: [],
          personalizationPackage: 'NONE',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('distinguishes a missing effective price from an explicitly configured zero price', async () => {
      mockRepository.findVariantById.mockResolvedValue({
        id: 'v-1',
        standardSize: 12,
        status: 'ACTIVE',
      });
      mockRepository.findActivePriceVersionsByGemstoneOptionIds.mockResolvedValue(
        [],
      );
      const request = {
        templateVariantId: 'v-1',
        targetSize: 12,
        gemstoneOptionIds: [],
        personalizationPackage: 'NONE',
      };
      mockRepository.findActivePriceVersionByVariantId
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ amount: 0 });
      await expect(estimateUseCase.execute(request)).rejects.toThrow(
        NotFoundException,
      );
      await expect(estimateUseCase.execute(request)).resolves.toMatchObject({
        estimatedTotal: 0,
      });
    });

    it('rejects a selected gemstone without an effective price', async () => {
      mockRepository.findVariantById.mockResolvedValue({
        id: 'v-1',
        standardSize: 12,
        status: 'ACTIVE',
      });
      mockRepository.findActivePriceVersionByVariantId.mockResolvedValue({
        id: 'pv-1',
        amount: 8000000,
      });
      mockRepository.findActivePriceVersionsByGemstoneOptionIds.mockResolvedValue(
        [],
      );

      await expect(
        estimateUseCase.execute({
          templateVariantId: 'v-1',
          targetSize: 12,
          gemstoneOptionIds: ['g-1'],
          personalizationPackage: 'NONE',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('calculates the estimate and records its price sources at one time', async () => {
      mockRepository.findVariantById.mockResolvedValue({
        id: 'v-1',
        standardSize: 12.0,
        maxUpDelta: 2.0,
        maxDownDelta: 2.0,
        status: 'ACTIVE',
      });
      mockRepository.findActivePriceVersionByVariantId.mockResolvedValue({
        id: 'pv-1',
        amount: 8000000,
      });
      mockRepository.findActivePriceVersionsByGemstoneOptionIds.mockResolvedValue(
        [{ id: 'pv-gem-1', amount: 6500000, gemstoneOptionId: 'g-1' }],
      );
      mockRepository.findActivePriceVersionByPersonalizationPackage.mockResolvedValue(
        { id: 'pv-pkg-1', amount: 800000 },
      );
      mockRepository.findActiveResizeRule.mockResolvedValue({
        id: 'rule-1',
        configJson: { base_fee: 100000, fee_per_unit_delta: 150000 },
      });

      mockRepository.findActivePriceVersionByMaintenancePlan.mockResolvedValue({
        id: 'pv-plan-1',
        amount: 550000,
      });
      const at = new Date('2026-11-28T00:00:00Z');
      const result = await estimateUseCase.snapshot(
        {
          templateVariantId: 'v-1',
          targetSize: 13.0,
          gemstoneOptionIds: ['g-1'],
          personalizationPackage: 'FINGERPRINT',
          maintenancePlan: 'LIFETIME_POLISHING',
        },
        at,
      );

      expect(result).toMatchObject({
        estimate: {
          estimatedTotal: 16100000,
          breakdown: { resizeFee: 250000 },
        },
        blankPriceVersionId: 'pv-1',
        gemstones: [{ gemstoneOptionId: 'g-1', priceVersionId: 'pv-gem-1' }],
        personalizationPriceVersionId: 'pv-pkg-1',
        resizeRuleId: 'rule-1',
        maintenancePlanPriceVersionId: 'pv-plan-1',
      });
      expect(mockRepository.findActiveResizeRule).toHaveBeenCalledWith(
        'v-1',
        'UP',
        at,
      );
      expect(
        mockRepository.findActivePriceVersionByMaintenancePlan,
      ).toHaveBeenCalledWith('LIFETIME_POLISHING', at);
    });
  });

  describe('PriceItem UseCases', () => {
    it('should return paginated price items', async () => {
      mockRepository.findPriceItems.mockResolvedValue({
        items: [
          {
            id: 'pi-1',
            priceType: 'RING_BLANK',
            code: 'RB-01',
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      });

      const res = await listPriceItemsUseCase.execute({});
      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);
    });

    it('should throw ConflictException if code exists', async () => {
      mockRepository.findPriceItemByCode.mockResolvedValue({ id: 'pi-1' });

      await expect(
        createPriceItemUseCase.execute({
          priceType: 'RING_BLANK',
          code: 'RB-01',
          templateVariantId: 'v-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw UnprocessableEntityException if missing required target reference', async () => {
      mockRepository.findPriceItemByCode.mockResolvedValue(undefined);

      await expect(
        createPriceItemUseCase.execute({
          priceType: 'RING_BLANK',
          code: 'RB-02',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('PriceVersion UseCases', () => {
    it('should create price version in DRAFT state with next versionNo', async () => {
      mockRepository.findPriceItemById.mockResolvedValue({ id: 'pi-1' });
      mockRepository.getLatestVersionNoForPriceItem.mockResolvedValue(2);
      mockRepository.createPriceVersion.mockResolvedValue({
        id: 'pv-3',
        priceItemId: 'pi-1',
        amount: 9000000,
        currency: 'VND',
        versionNo: 3,
        status: 'DRAFT',
        sourceType: 'MANUAL',
        createdAt: new Date(),
      });

      const res = await createPriceVersionUseCase.execute({
        priceItemId: 'pi-1',
        amount: 9000000,
      });

      expect(res.versionNo).toBe(3);
      expect(res.status).toBe('DRAFT');
    });

    it('should approve or reject draft price version and map errors', async () => {
      mockRepository.approvePriceVersion.mockResolvedValue({
        id: 'pv-1',
        priceItemId: 'pi-1',
        amount: 9000000,
        currency: 'VND',
        versionNo: 1,
        status: 'ACTIVE',
        sourceType: 'MANUAL',
        createdAt: new Date(),
      });

      const approved = await approvePriceVersionUseCase.execute({
        versionId: 'pv-1',
      });
      expect(approved.status).toBe('ACTIVE');

      mockRepository.rejectPriceVersion.mockRejectedValue(
        new Error('PRICE_VERSION_NOT_DRAFT'),
      );
      await expect(
        rejectPriceVersionUseCase.execute({
          versionId: 'pv-1',
          reviewNote: 'Invalid amount',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('PricingRule UseCases', () => {
    it('should create and activate pricing rule', async () => {
      mockRepository.getLatestVersionNoForPricingRule.mockResolvedValue(0);
      mockRepository.createPricingRule.mockResolvedValue({
        id: 'r-1',
        ruleType: 'RESIZE_FEE',
        code: 'RESIZE_UP',
        name: 'Resize Up',
        versionNo: 1,
        status: 'DRAFT',
        createdAt: new Date(),
      });

      const created = await createPricingRuleUseCase.execute({
        ruleType: 'RESIZE_FEE',
        code: 'RESIZE_UP',
        name: 'Resize Up',
        configJson: '{"base_fee":100000}',
      });
      expect(created.status).toBe('DRAFT');

      mockRepository.activatePricingRule.mockRejectedValue(
        new Error('PRICING_RULE_NOT_FOUND'),
      );
      await expect(
        activatePricingRuleUseCase.execute({ ruleId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
