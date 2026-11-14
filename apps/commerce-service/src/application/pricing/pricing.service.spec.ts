import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingRepository } from '../../repositories/pricing.repository';

describe('PricingService', () => {
  let service: PricingService;

  const mockRepository = {
    findVariantById: jest.fn(),
    findActivePriceVersionByVariantId: jest.fn(),
    findActivePriceVersionsByGemstoneOptionIds: jest.fn(),
    findActivePriceVersionByPersonalizationPackage: jest.fn(),
    findActiveResizeRule: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PricingRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    jest.clearAllMocks();
  });

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
