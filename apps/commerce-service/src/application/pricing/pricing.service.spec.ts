import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingRepository } from '../../repositories/pricing.repository';
import { PricingMapper } from './pricing.mapper';

describe('PricingService', () => {
  let service: PricingService;

  const mockRepository = {
    findVariantById: jest.fn(),
    findActivePriceVersionByVariantId: jest.fn(),
    findActivePriceVersionsByGemstoneOptionIds: jest.fn(),
    findActivePriceVersionByPersonalizationPackage: jest.fn(),
    findActiveResizeRule: jest.fn(),
    findPriceItems: jest.fn(),
    findPriceItemById: jest.fn(),
    findPriceItemByCode: jest.fn(),
    createPriceItem: jest.fn(),
    findPriceVersions: jest.fn(),
    findPriceVersionById: jest.fn(),
    getLatestVersionNoForPriceItem: jest.fn(),
    createPriceVersion: jest.fn(),
    approvePriceVersion: jest.fn(),
    rejectPriceVersion: jest.fn(),
    findPricingRules: jest.fn(),
    findPricingRuleById: jest.fn(),
    getLatestVersionNoForPricingRule: jest.fn(),
    createPricingRule: jest.fn(),
    activatePricingRule: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        PricingMapper,
        {
          provide: PricingRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    jest.clearAllMocks();
  });

  describe('estimatePrice (PRICI-001)', () => {
    it('should throw NotFoundException if variant does not exist', async () => {
      mockRepository.findVariantById.mockResolvedValue(null);

      await expect(
        service.estimatePrice({
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
        standard_size: '12.0',
        max_up_delta: '1.0',
        max_down_delta: '1.0',
        status: 'ACTIVE',
      });

      await expect(
        service.estimatePrice({
          templateVariantId: 'v-1',
          targetSize: 14.0, // delta is 2.0 > max_up_delta 1.0
          gemstoneOptionIds: [],
          personalizationPackage: 'NONE',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should calculate complete estimated price with blank, gemstones, personalization and resize fee', async () => {
      mockRepository.findVariantById.mockResolvedValue({
        id: 'v-1',
        standard_size: '12.0',
        max_up_delta: '2.0',
        max_down_delta: '2.0',
        status: 'ACTIVE',
      });

      mockRepository.findActivePriceVersionByVariantId.mockResolvedValue({
        id: 'pv-1',
        amount: '8000000',
      });

      mockRepository.findActivePriceVersionsByGemstoneOptionIds.mockResolvedValue(
        [
          {
            id: 'pv-gem-1',
            amount: '6500000',
            price_items: { gemstone_option_id: 'g-1' },
          },
        ],
      );

      mockRepository.findActivePriceVersionByPersonalizationPackage.mockResolvedValue(
        {
          id: 'pv-pkg-1',
          amount: '800000',
        },
      );

      mockRepository.findActiveResizeRule.mockResolvedValue({
        id: 'rule-1',
        config_json: {
          base_fee: 100000,
          fee_per_unit_delta: 100000,
        },
      });

      const result = await service.estimatePrice({
        templateVariantId: 'v-1',
        targetSize: 13.0, // delta 1.0 -> resize fee = 100k + 1*100k = 200k
        gemstoneOptionIds: ['g-1'],
        personalizationPackage: 'SOUNDWAVE',
      });

      expect(result.breakdown.baseBlankPrice).toBe(8000000);
      expect(result.breakdown.gemstonesPrice).toBe(6500000);
      expect(result.breakdown.personalizationFee).toBe(800000);
      expect(result.breakdown.resizeFee).toBe(200000);
      expect(result.estimatedTotal).toBe(15500000);
      expect(result.currency).toBe('VND');
      expect(result.gemstoneLineItems).toHaveLength(1);
      expect(result.gemstoneLineItems[0].price).toBe(6500000);
    });
  });

  describe('listPriceItems (PRICI-002)', () => {
    it('should return paginated price items', async () => {
      const now = new Date();
      mockRepository.findPriceItems.mockResolvedValue({
        items: [
          {
            id: 'pi-1',
            price_type: 'RING_BLANK',
            code: 'PI-RB-01',
            status: 'ACTIVE',
            created_at: now,
            updated_at: now,
            price_versions: {
              id: 'pv-1',
              price_item_id: 'pi-1',
              amount: '5000000',
              currency: 'VND',
              version_no: 1,
              status: 'ACTIVE',
              source_type: 'MANUAL',
              created_at: now,
            },
          },
        ],
        total: 1,
      });

      const res = await service.listPriceItems({ limit: 10, offset: 0 });
      expect(res.total).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].code).toBe('PI-RB-01');
      expect(res.items[0].activePriceVersion?.amount).toBe(5000000);
    });
  });

  describe('createPriceItem (PRICI-003)', () => {
    it('should throw ConflictException if code exists', async () => {
      mockRepository.findPriceItemByCode.mockResolvedValue({ id: 'pi-old' });

      await expect(
        service.createPriceItem({
          priceType: 'RING_BLANK',
          code: 'PI-EXISTING',
          templateVariantId: '11111111-1111-1111-1111-111111111111',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw UnprocessableEntityException if missing required target reference', async () => {
      mockRepository.findPriceItemByCode.mockResolvedValue(null);

      await expect(
        service.createPriceItem({
          priceType: 'RING_BLANK',
          code: 'PI-NEW',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should create price item successfully', async () => {
      const now = new Date();
      mockRepository.findPriceItemByCode.mockResolvedValue(null);
      mockRepository.createPriceItem.mockResolvedValue({
        id: 'pi-new',
        price_type: 'RING_BLANK',
        code: 'PI-NEW',
        template_variant_id: '11111111-1111-1111-1111-111111111111',
        status: 'ACTIVE',
        created_at: now,
        updated_at: now,
      });

      const res = await service.createPriceItem({
        priceType: 'RING_BLANK',
        code: 'PI-NEW',
        templateVariantId: '11111111-1111-1111-1111-111111111111',
      });

      expect(res.id).toBe('pi-new');
      expect(res.code).toBe('PI-NEW');
    });
  });

  describe('listPriceVersions (PRICI-004)', () => {
    it('should return paginated price versions', async () => {
      const now = new Date();
      mockRepository.findPriceVersions.mockResolvedValue({
        versions: [
          {
            id: 'pv-1',
            price_item_id: 'pi-1',
            amount: '4000000',
            currency: 'VND',
            version_no: 1,
            status: 'DRAFT',
            source_type: 'MANUAL',
            created_at: now,
          },
        ],
        total: 1,
      });

      const res = await service.listPriceVersions({ priceItemId: 'pi-1' });
      expect(res.total).toBe(1);
      expect(res.versions[0].amount).toBe(4000000);
      expect(res.versions[0].status).toBe('DRAFT');
    });
  });

  describe('createPriceVersion (PRICI-005)', () => {
    it('should throw NotFoundException if price item does not exist', async () => {
      mockRepository.findPriceItemById.mockResolvedValue(null);

      await expect(
        service.createPriceVersion({
          priceItemId: 'pi-unknown',
          amount: 5000000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnprocessableEntityException if amount <= 0', async () => {
      mockRepository.findPriceItemById.mockResolvedValue({ id: 'pi-1' });

      await expect(
        service.createPriceVersion({
          priceItemId: 'pi-1',
          amount: -100,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should create price version in DRAFT state with next version_no', async () => {
      const now = new Date();
      mockRepository.findPriceItemById.mockResolvedValue({ id: 'pi-1' });
      mockRepository.getLatestVersionNoForPriceItem.mockResolvedValue(2);
      mockRepository.createPriceVersion.mockResolvedValue({
        id: 'pv-3',
        price_item_id: 'pi-1',
        amount: '6000000',
        currency: 'VND',
        version_no: 3,
        status: 'DRAFT',
        source_type: 'MANUAL',
        created_at: now,
      });

      const res = await service.createPriceVersion({
        priceItemId: 'pi-1',
        amount: 6000000,
      });

      expect(res.versionNo).toBe(3);
      expect(res.status).toBe('DRAFT');
      expect(res.amount).toBe(6000000);
    });
  });

  describe('approvePriceVersion (PRICI-006)', () => {
    it('should approve draft price version', async () => {
      const now = new Date();
      mockRepository.approvePriceVersion.mockResolvedValue({
        id: 'pv-1',
        price_item_id: 'pi-1',
        amount: '6000000',
        currency: 'VND',
        version_no: 2,
        status: 'ACTIVE',
        source_type: 'MANUAL',
        review_note: 'Approved OK',
        reviewed_by_user_id: 'user-admin',
        reviewed_at: now,
        created_at: now,
      });

      const res = await service.approvePriceVersion({
        versionId: 'pv-1',
        reviewNote: 'Approved OK',
        reviewedByUserId: 'user-admin',
      });

      expect(res.status).toBe('ACTIVE');
      expect(res.reviewNote).toBe('Approved OK');
    });

    it('should throw NotFoundException if version not found', async () => {
      mockRepository.approvePriceVersion.mockRejectedValue(
        new Error('PRICE_VERSION_NOT_FOUND'),
      );

      await expect(
        service.approvePriceVersion({
          versionId: 'pv-unknown',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnprocessableEntityException if version is not DRAFT', async () => {
      mockRepository.approvePriceVersion.mockRejectedValue(
        new Error('PRICE_VERSION_NOT_DRAFT'),
      );

      await expect(
        service.approvePriceVersion({
          versionId: 'pv-active',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('rejectPriceVersion (PRICI-007)', () => {
    it('should reject draft price version', async () => {
      const now = new Date();
      mockRepository.rejectPriceVersion.mockResolvedValue({
        id: 'pv-1',
        price_item_id: 'pi-1',
        amount: '6000000',
        currency: 'VND',
        version_no: 2,
        status: 'REJECTED',
        source_type: 'MANUAL',
        review_note: 'Price too low',
        reviewed_by_user_id: 'user-admin',
        reviewed_at: now,
        created_at: now,
      });

      const res = await service.rejectPriceVersion({
        versionId: 'pv-1',
        reviewNote: 'Price too low',
        reviewedByUserId: 'user-admin',
      });

      expect(res.status).toBe('REJECTED');
      expect(res.reviewNote).toBe('Price too low');
    });
  });

  describe('listPricingRules (PRICI-008)', () => {
    it('should return paginated pricing rules', async () => {
      const now = new Date();
      mockRepository.findPricingRules.mockResolvedValue({
        rules: [
          {
            id: 'rule-1',
            rule_type: 'DELIVERY_FEE',
            code: 'RULE-DELIV',
            name: 'Delivery HCM',
            status: 'ACTIVE',
            version_no: 1,
            created_at: now,
          },
        ],
        total: 1,
      });

      const res = await service.listPricingRules({ ruleType: 'DELIVERY_FEE' });
      expect(res.total).toBe(1);
      expect(res.rules[0].code).toBe('RULE-DELIV');
    });
  });

  describe('createPricingRule (PRICI-009)', () => {
    it('should create pricing rule in DRAFT state', async () => {
      const now = new Date();
      mockRepository.getLatestVersionNoForPricingRule.mockResolvedValue(0);
      mockRepository.createPricingRule.mockResolvedValue({
        id: 'rule-new',
        rule_type: 'DELIVERY_FEE',
        code: 'RULE-DELIV-02',
        name: 'Delivery Danang',
        status: 'DRAFT',
        version_no: 1,
        created_at: now,
      });

      const res = await service.createPricingRule({
        ruleType: 'DELIVERY_FEE',
        code: 'RULE-DELIV-02',
        name: 'Delivery Danang',
      });

      expect(res.status).toBe('DRAFT');
      expect(res.versionNo).toBe(1);
    });
  });

  describe('activatePricingRule (PRICI-010)', () => {
    it('should activate draft pricing rule', async () => {
      const now = new Date();
      mockRepository.activatePricingRule.mockResolvedValue({
        id: 'rule-1',
        rule_type: 'DELIVERY_FEE',
        code: 'RULE-DELIV',
        name: 'Delivery HCM',
        status: 'ACTIVE',
        version_no: 1,
        approved_by_user_id: 'user-admin',
        approved_at: now,
        created_at: now,
      });

      const res = await service.activatePricingRule({
        ruleId: 'rule-1',
        approvedByUserId: 'user-admin',
      });

      expect(res.status).toBe('ACTIVE');
      expect(res.approvedByUserId).toBe('user-admin');
    });

    it('should throw NotFoundException if rule not found', async () => {
      mockRepository.activatePricingRule.mockRejectedValue(
        new Error('PRICING_RULE_NOT_FOUND'),
      );

      await expect(
        service.activatePricingRule({
          ruleId: 'rule-unknown',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnprocessableEntityException if rule not DRAFT', async () => {
      mockRepository.activatePricingRule.mockRejectedValue(
        new Error('PRICING_RULE_NOT_DRAFT'),
      );

      await expect(
        service.activatePricingRule({
          ruleId: 'rule-active',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
