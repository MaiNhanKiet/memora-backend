import { parseGemstoneSelections } from './cart.service';

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
