import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CartRepository } from '../../repositories/cart.repository';
import { PricingService } from '../pricing/pricing.service';

describe('CartService', () => {
  let service: CartService;
  const validUserId1 = '11111111-1111-4111-8111-111111111111';
  const validUserId2 = '22222222-2222-4222-8222-222222222222';

  const mockRepository = {
    findActiveCartByActor: jest.fn(),
    createActiveCart: jest.fn(),
    findDraftById: jest.fn(),
    createDraft: jest.fn(),
    updateDraft: jest.fn(),
    deleteDraft: jest.fn(),
    updateCartStatus: jest.fn(),
    createDesignShareCode: jest.fn(),
    findDesignCodeById: jest.fn(),
    revokeDesignShareCode: jest.fn(),
  };

  const mockPricingService = {
    estimatePrice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: CartRepository,
          useValue: mockRepository,
        },
        {
          provide: PricingService,
          useValue: mockPricingService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should throw BadRequestException if neither userId nor guestSessionId is provided', async () => {
      await expect(
        service.getCart({ actor: { userId: '', guestSessionId: '' } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-create active cart if user has no cart yet', async () => {
      mockRepository.findActiveCartByActor
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'cart-1',
          status: 'ACTIVE',
          expires_at: null,
          ring_design_drafts: [],
        });

      mockRepository.createActiveCart.mockResolvedValue({ id: 'cart-1' });

      const res = await service.getCart({
        actor: { userId: validUserId1 },
      });

      expect(mockRepository.createActiveCart).toHaveBeenCalledWith({
        userId: validUserId1,
        guestSessionId: undefined,
        expiresAt: undefined,
      });
      expect(res.id).toBe('cart-1');
      expect(res.itemsCount).toBe(0);
    });
  });

  describe('addCartItem', () => {
    it('should calculate estimated price and persist draft in cart', async () => {
      mockRepository.findActiveCartByActor.mockResolvedValue({
        id: 'cart-1',
        status: 'ACTIVE',
        ring_design_drafts: [],
      });

      mockPricingService.estimatePrice.mockResolvedValue({
        estimatedTotal: 15500000,
        currency: 'VND',
      });

      mockRepository.createDraft.mockResolvedValue({
        id: 'draft-1',
        template_variant_id: 'variant-1',
        target_size: '13.0',
        personalization_package: 'SOUNDWAVE',
        memory_enabled: true,
        gemstone_config_json: [{ slotNumber: 1, gemstoneOptionId: 'gem-1' }],
        estimated_price: '15500000',
        currency: 'VND',
        estimated_price_at: new Date('2026-11-14'),
        status: 'IN_CART',
        created_at: new Date('2026-11-14'),
        template_variants: {
          standard_size: '12.0',
          materials: { name: 'Yellow Gold 18K' },
          ring_templates: { code: 'RT-CLASSIC-01', name: 'Classic Solitaire' },
        },
      });

      const res = await service.addCartItem({
        actor: { userId: validUserId1 },
        templateVariantId: 'variant-1',
        targetSize: 13.0,
        gemstoneSelections: [{ slotNumber: 1, gemstoneOptionId: 'gem-1' }],
        personalizationPackage: 'SOUNDWAVE',
        memoryEnabled: true,
      });

      expect(mockPricingService.estimatePrice).toHaveBeenCalledWith({
        templateVariantId: 'variant-1',
        targetSize: 13.0,
        gemstoneOptionIds: ['gem-1'],
        personalizationPackage: 'SOUNDWAVE',
      });
      expect(res.item.draftId).toBe('draft-1');
      expect(res.item.estimatedPrice).toBe(15500000);
    });
  });

  describe('updateCartItem', () => {
    it('should throw ForbiddenException if actor is not the cart owner', async () => {
      mockRepository.findDraftById.mockResolvedValue({
        id: 'draft-1',
        status: 'IN_CART',
        carts: {
          user_id: 'other-user',
          guest_session_id: null,
        },
      });

      await expect(
        service.updateCartItem({
          actor: { userId: validUserId1 },
          draftId: 'draft-1',
          targetSize: 13.5,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateCheckout', () => {
    it('should throw BadRequestException if more than 2 drafts selected (BM04 rule)', async () => {
      mockRepository.findActiveCartByActor.mockResolvedValue({
        id: 'cart-1',
        ring_design_drafts: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }],
      });

      await expect(
        service.validateCheckout({
          actor: { userId: validUserId1 },
          selectedDraftIds: ['d1', 'd2', 'd3'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('abandonCart', () => {
    it('should update cart status to ABANDONED', async () => {
      mockRepository.findActiveCartByActor.mockResolvedValue({
        id: 'cart-1',
        ring_design_drafts: [],
      });

      const res = await service.abandonCart({
        actor: { userId: validUserId1 },
      });

      expect(mockRepository.updateCartStatus).toHaveBeenCalledWith(
        'cart-1',
        'ABANDONED',
      );
      expect(res.status).toBe('ABANDONED');
    });
  });

  describe('getDesignDraft', () => {
    it('should throw NotFoundException if draft does not exist', async () => {
      mockRepository.findDraftById.mockResolvedValue(null);

      await expect(
        service.getDesignDraft({
          draftId: 'missing-draft',
          actor: { userId: validUserId1 },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if actor is not the owner', async () => {
      mockRepository.findDraftById.mockResolvedValue({
        id: 'draft-1',
        carts: {
          user_id: validUserId2,
          guest_session_id: null,
        },
      });

      await expect(
        service.getDesignDraft({
          draftId: 'draft-1',
          actor: { userId: validUserId1 },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return draft details successfully for owner', async () => {
      mockRepository.findDraftById.mockResolvedValue({
        id: 'draft-1',
        cart_id: 'cart-1',
        template_variant_id: 'variant-1',
        target_size: '14.0',
        personalization_package: 'SOUNDWAVE',
        memory_enabled: true,
        gemstone_config_json: [{ slotNumber: 1, gemstoneOptionId: 'gem-1' }],
        estimated_price: '16000000',
        currency: 'VND',
        estimated_price_at: new Date('2026-11-14'),
        status: 'IN_CART',
        created_at: new Date('2026-11-14'),
        updated_at: new Date('2026-11-14'),
        carts: {
          user_id: validUserId1,
          guest_session_id: null,
        },
        template_variants: {
          standard_size: '12.0',
          materials: { name: 'Yellow Gold 18K' },
          ring_templates: { code: 'RT-01', name: 'Classic' },
        },
      });

      const res = await service.getDesignDraft({
        draftId: 'draft-1',
        actor: { userId: validUserId1 },
      });

      expect(res.draft.draftId).toBe('draft-1');
      expect(res.draft.estimatedPrice).toBe(16000000);
      expect(res.draft.templateVariantId).toBe('variant-1');
      expect(res.draft.targetSize).toBe(14.0);
    });
  });

  describe('duplicateDesignDraft', () => {
    it('should throw NotFoundException if source draft does not exist', async () => {
      mockRepository.findDraftById.mockResolvedValue(null);

      await expect(
        service.duplicateDesignDraft({
          draftId: 'missing-draft',
          actor: { userId: validUserId1 },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if actor is not the owner of source draft', async () => {
      mockRepository.findDraftById.mockResolvedValue({
        id: 'draft-1',
        carts: {
          user_id: validUserId2,
          guest_session_id: null,
        },
      });

      await expect(
        service.duplicateDesignDraft({
          draftId: 'draft-1',
          actor: { userId: validUserId1 },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should duplicate draft with recalculated price into active cart', async () => {
      mockRepository.findDraftById.mockResolvedValue({
        id: 'draft-1',
        template_variant_id: 'variant-1',
        target_size: '14.0',
        personalization_package: 'SOUNDWAVE',
        memory_enabled: true,
        gemstone_config_json: [{ slotNumber: 1, gemstoneOptionId: 'gem-1' }],
        carts: {
          user_id: validUserId1,
          guest_session_id: null,
        },
      });

      mockRepository.findActiveCartByActor.mockResolvedValue({
        id: 'cart-1',
        status: 'ACTIVE',
        ring_design_drafts: [],
      });

      mockPricingService.estimatePrice.mockResolvedValue({
        estimatedTotal: 16500000,
        currency: 'VND',
      });

      mockRepository.createDraft.mockResolvedValue({
        id: 'draft-new',
        template_variant_id: 'variant-1',
        target_size: '14.0',
        personalization_package: 'SOUNDWAVE',
        memory_enabled: true,
        gemstone_config_json: [{ slotNumber: 1, gemstoneOptionId: 'gem-1' }],
        estimated_price: '16500000',
        currency: 'VND',
        estimated_price_at: new Date('2026-11-14'),
        status: 'IN_CART',
        created_at: new Date('2026-11-14'),
        template_variants: {
          standard_size: '12.0',
          materials: { name: 'Yellow Gold 18K' },
          ring_templates: { code: 'RT-01', name: 'Classic' },
        },
      });

      const res = await service.duplicateDesignDraft({
        draftId: 'draft-1',
        actor: { userId: validUserId1 },
      });

      expect(mockPricingService.estimatePrice).toHaveBeenCalledWith({
        templateVariantId: 'variant-1',
        targetSize: 14.0,
        gemstoneOptionIds: ['gem-1'],
        personalizationPackage: 'SOUNDWAVE',
      });
      expect(mockRepository.createDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          cartId: 'cart-1',
          templateVariantId: 'variant-1',
          estimatedPrice: 16500000,
        }),
      );
      expect(res.draft.draftId).toBe('draft-new');
      expect(res.itemsCount).toBe(0);
    });
  });

  describe('createDesignShareLink (DESIG-009)', () => {
    it('should throw NotFoundException if draft not found', async () => {
      mockRepository.findDraftById.mockResolvedValue(null);

      await expect(
        service.createDesignShareLink({
          draftId: 'draft-not-found',
          actor: { userId: validUserId1 },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own draft', async () => {
      mockRepository.findDraftById.mockResolvedValue({
        id: 'draft-1',
        owner_user_id: validUserId2,
      });

      await expect(
        service.createDesignShareLink({
          draftId: 'draft-1',
          actor: { userId: validUserId1 },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create share link successfully', async () => {
      mockRepository.findDraftById.mockResolvedValue({
        id: 'draft-1',
        owner_user_id: validUserId1,
      });

      mockRepository.createDesignShareCode.mockResolvedValue({
        id: 'link-1',
        ring_design_draft_id: 'draft-1',
        status: 'ACTIVE',
        expires_at: new Date('2026-11-22T00:00:00.000Z'),
      });

      const res = await service.createDesignShareLink({
        draftId: 'draft-1',
        actor: { userId: validUserId1 },
      });

      expect(res.linkId).toBe('link-1');
      expect(res.status).toBe('ACTIVE');
      expect(res.code).toMatch(/^MMR-/);
      expect(res.shareUrl).toContain(res.code);
    });
  });

  describe('revokeDesignShareLink (DESIG-010)', () => {
    it('should throw NotFoundException if draft not found', async () => {
      mockRepository.findDraftById.mockResolvedValue(null);

      await expect(
        service.revokeDesignShareLink({
          draftId: 'draft-1',
          linkId: 'link-1',
          actor: { userId: validUserId1 },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if linkId not found for draft', async () => {
      mockRepository.findDraftById.mockResolvedValue({
        id: 'draft-1',
        owner_user_id: validUserId1,
      });
      mockRepository.findDesignCodeById.mockResolvedValue(null);

      await expect(
        service.revokeDesignShareLink({
          draftId: 'draft-1',
          linkId: 'link-1',
          actor: { userId: validUserId1 },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should revoke share link successfully', async () => {
      mockRepository.findDraftById.mockResolvedValue({
        id: 'draft-1',
        owner_user_id: validUserId1,
      });
      mockRepository.findDesignCodeById.mockResolvedValue({
        id: 'link-1',
        ring_design_draft_id: 'draft-1',
        status: 'ACTIVE',
      });

      const res = await service.revokeDesignShareLink({
        draftId: 'draft-1',
        linkId: 'link-1',
        actor: { userId: validUserId1 },
      });

      expect(res.success).toBe(true);
      expect(mockRepository.revokeDesignShareCode).toHaveBeenCalledWith(
        'link-1',
      );
    });
  });
});
