import type { ValidationError } from '@app/contracts';
import type {
  GemstoneSlotRecord,
  TemplateCompatibilityRecord,
} from './catalog.repository';

type SelectionSlot = Pick<
  GemstoneSlotRecord,
  'id' | 'slotIndex' | 'gemstoneGroupId' | 'isRequired'
>;
type CompatibleOption = Pick<
  TemplateCompatibilityRecord,
  'gemstoneGroupId' | 'gemstoneOptionId'
>;

export function validateGemstoneSlotSelections(
  slots: readonly SelectionSlot[],
  compatibilities: readonly CompatibleOption[],
  selections: readonly { slotNumber: number; gemstoneOptionId: string }[],
): { slotIds: string[]; errors: ValidationError[] } {
  const slotIds: string[] = [];
  const usedSlots = new Set<string>();
  const errors: ValidationError[] = [];

  for (const selection of selections) {
    const optionId = selection.gemstoneOptionId.toLowerCase();
    const matchingSlots = slots.filter(
      (slot) =>
        slot.slotIndex === selection.slotNumber &&
        compatibilities.some(
          (option) =>
            option.gemstoneOptionId === optionId &&
            option.gemstoneGroupId === slot.gemstoneGroupId,
        ),
    );
    const slot = matchingSlots.length === 1 ? matchingSlots[0] : undefined;
    if (!slot || usedSlots.has(slot.id)) {
      errors.push({
        code: 'GEMSTONE_INCOMPATIBLE',
        field: 'gemstoneSelections[slotNumber=' + selection.slotNumber + ']',
        message:
          'Gemstone option must match a unique, unselected slot in its compatible group',
      });
      continue;
    }
    usedSlots.add(slot.id);
    slotIds.push(slot.id);
  }

  for (const slot of slots) {
    if (slot.isRequired && !usedSlots.has(slot.id)) {
      errors.push({
        code: 'REQUIRED_SLOT_EMPTY',
        field: 'gemstoneSelections[slotNumber=' + slot.slotIndex + ']',
        message: 'A gemstone selection is required for slot #' + slot.slotIndex,
      });
    }
  }
  return { slotIds, errors };
}
