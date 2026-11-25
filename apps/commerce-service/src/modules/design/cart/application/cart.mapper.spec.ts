import {
  extractMaintenancePlan,
  mapCartResponse,
  parseGemstoneSelections,
} from './cart.mapper';

describe('cart.mapper', () => {
  describe('parseGemstoneSelections', () => {
    it('should parse valid array of gemstone selections', () => {
      const input = [
        { gemstoneOptionId: 'gem-1', slotIndex: 0 },
        { gemstoneOptionId: 'gem-2', slotIndex: 1 },
      ];

      expect(parseGemstoneSelections(input)).toEqual(input);
    });

    it('should parse valid object wrapper with selections array', () => {
      const input = {
        selections: [{ gemstoneOptionId: 'gem-1', slotIndex: 0 }],
        maintenancePlan: 'GOLD',
      };

      expect(parseGemstoneSelections(input)).toEqual([
        { gemstoneOptionId: 'gem-1', slotIndex: 0 },
      ]);
    });

    it('should filter out invalid items and return empty array for null/undefined/invalid shapes', () => {
      expect(parseGemstoneSelections(null)).toEqual([]);
      expect(parseGemstoneSelections(undefined)).toEqual([]);
      expect(parseGemstoneSelections('invalid')).toEqual([]);
      expect(parseGemstoneSelections(123)).toEqual([]);
      expect(
        parseGemstoneSelections([
          { gemstoneOptionId: 'gem-valid', slotIndex: 0 },
          { gemstoneOptionId: 123 },
          { wrongKey: 'abc' },
          null,
          { gemstoneOptionId: 'gem-bad-slot', slotIndex: '0' },
        ]),
      ).toEqual([{ gemstoneOptionId: 'gem-valid', slotIndex: 0 }]);
    });
  });

  describe('extractMaintenancePlan', () => {
    it('should extract maintenancePlan string when present', () => {
      expect(extractMaintenancePlan({ maintenancePlan: 'GOLD' })).toBe('GOLD');
      expect(extractMaintenancePlan(null)).toBeUndefined();
      expect(extractMaintenancePlan([])).toBeUndefined();
    });
  });

  describe('mapCartResponse', () => {
    it('should map cart and total estimated price', () => {
      const now = new Date('2026-11-25T10:00:00Z');
      const result = mapCartResponse({
        id: 'cart-1',
        status: 'ACTIVE',
        drafts: [
          {
            id: 'draft-1',
            templateVariantId: 'var-1',
            targetSize: 12,
            personalizationPackage: 'NONE',
            memoryEnabled: false,
            gemstoneConfigJson: [{ gemstoneOptionId: 'gem-1', slotIndex: 0 }],
            estimatedPrice: 1500000,
            currency: 'VND',
            status: 'IN_CART',
            createdAt: now,
          },
        ],
      });

      expect(result.itemsCount).toBe(1);
      expect(result.totalEstimatedPrice).toBe(1500000);
      expect(result.items[0].gemstoneSelections).toEqual([
        { gemstoneOptionId: 'gem-1', slotIndex: 0 },
      ]);
    });
  });
});
