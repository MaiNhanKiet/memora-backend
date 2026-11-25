import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { CartDraftRecord } from './cart.repository';
import { assertDraftOwnership, validateCartActor } from './cart.validation';

describe('cart.validation', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const guestSessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  describe('validateCartActor', () => {
    it('should accept USER actor', () => {
      expect(validateCartActor({ userId })).toEqual({ userId });
    });

    it('should accept GUEST_SESSION actor', () => {
      expect(validateCartActor({ guestSessionId })).toEqual({
        guestSessionId,
      });
    });

    it('should reject missing or unsupported actor', () => {
      expect(() => validateCartActor({})).toThrow(BadRequestException);
    });
  });

  describe('assertDraftOwnership', () => {
    const baseDraft: CartDraftRecord = {
      id: 'draft-1',
      cartOwnerUserId: 'user-1',
      cartGuestSessionId: 'guest-1',
      templateVariantId: 'var-1',
      targetSize: 12,
      personalizationPackage: 'NONE',
      memoryEnabled: false,
      gemstoneConfigJson: [],
      estimatedPrice: 1000000,
      currency: 'VND',
      status: 'IN_CART',
      createdAt: new Date(),
    };

    it('should allow matching user or guest owner', () => {
      expect(() =>
        assertDraftOwnership(baseDraft, { userId: 'user-1' }),
      ).not.toThrow();
      expect(() =>
        assertDraftOwnership(baseDraft, { guestSessionId: 'guest-1' }),
      ).not.toThrow();
    });

    it('should throw ForbiddenException for non-owner', () => {
      expect(() =>
        assertDraftOwnership(baseDraft, { userId: 'user-2' }),
      ).toThrow(ForbiddenException);
    });
  });
});
