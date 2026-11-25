import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstimatePriceUseCase } from './estimate-price.use-case';
import { PriceItemUseCases } from './price-item.use-cases';
import { PriceVersionUseCases } from './price-version.use-cases';
import { PRICING_REPOSITORY } from './pricing.repository';
import { PricingRuleUseCases } from './pricing-rule.use-cases';

describe('Pricing Use Cases', () => {
  let estimateUseCase: EstimatePriceUseCase;
  let itemUseCases: PriceItemUseCases;
  let versionUseCases: PriceVersionUseCases;
  let ruleUseCases: PricingRuleUseCases;

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
        PriceItemUseCases,
        PriceVersionUseCases,
        PricingRuleUseCases,
        { provide: PRICING_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    estimateUseCase = module.get<EstimatePriceUseCase>(EstimatePriceUseCase);
    itemUseCases = module.get<PriceItemUseCases>(PriceItemUseCases);
    versionUseCases = module.get<PriceVersionUseCases>(PriceVersionUseCases);
    ruleUseCases = module.get<PricingRuleUseCases>(PricingRuleUseCases);
    jest.clearAllMocks();
  });

  describe('EstimatePriceUseCase', () => {
    it('should throw NotFoundException if variant does not exist', async () => {
      mockRepository.findVariantById.mockResolvedValue(null);

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

    it('should calculate complete estimated price with blank, gemstones, personalization and resize fee', async () => {
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

      const res = await estimateUseCase.execute({
        templateVariantId: 'v-1',
        targetSize: 13.0,
        gemstoneOptionIds: ['g-1'],
        personalizationPackage: 'FINGERPRINT',
      });

      expect(res.estimatedTotal).toBe(15550000);
      expect(res.breakdown.resizeFee).toBe(250000);
    });
  });

  describe('PriceItemUseCases', () => {
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

      const res = await itemUseCases.listPriceItems({});
      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);
    });

    it('should throw ConflictException if code exists', async () => {
      mockRepository.findPriceItemByCode.mockResolvedValue({ id: 'pi-1' });

      await expect(
        itemUseCases.createPriceItem({
          priceType: 'RING_BLANK',
          code: 'RB-01',
          templateVariantId: 'v-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw UnprocessableEntityException if missing required target reference', async () => {
      mockRepository.findPriceItemByCode.mockResolvedValue(null);

      await expect(
        itemUseCases.createPriceItem({
          priceType: 'RING_BLANK',
          code: 'RB-02',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('PriceVersionUseCases', () => {
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

      const res = await versionUseCases.createPriceVersion({
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

      const approved = await versionUseCases.approvePriceVersion({
        versionId: 'pv-1',
      });
      expect(approved.status).toBe('ACTIVE');

      mockRepository.rejectPriceVersion.mockRejectedValue(
        new Error('PRICE_VERSION_NOT_DRAFT'),
      );
      await expect(
        versionUseCases.rejectPriceVersion({
          versionId: 'pv-1',
          reviewNote: 'Invalid amount',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('PricingRuleUseCases', () => {
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

      const created = await ruleUseCases.createPricingRule({
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
        ruleUseCases.activatePricingRule({ ruleId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
