import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartRepository } from '../../repositories/cart.repository';
import { PricingService } from '../pricing/pricing.service';

describe('CartService', () => {
  let service: CartService;

  const mockRepository = {
    findActiveCartByActor: jest.fn(),
    createActiveCart: jest.fn(),
    findDraftById: jest.fn(),
    createDraft: jest.fn(),
    updateDraft: jest.fn(),
    deleteDraft: jest.fn(),
    updateCartStatus: jest.fn(),
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
        actor: { userId: 'user-1' },
      });

      expect(mockRepository.createActiveCart).toHaveBeenCalledWith({
        userId: 'user-1',
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
        actor: { userId: 'user-1' },
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
          actor: { userId: 'user-1' },
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
          actor: { userId: 'user-1' },
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
        actor: { userId: 'user-1' },
      });

      expect(mockRepository.updateCartStatus).toHaveBeenCalledWith(
        'cart-1',
        'ABANDONED',
      );
      expect(res.status).toBe('ABANDONED');
    });
  });
});
