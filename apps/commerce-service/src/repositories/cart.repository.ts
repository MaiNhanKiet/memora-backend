import { Injectable } from '@nestjs/common';
import type { carts, ring_design_drafts } from '../../generated/prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';

export interface FindCartActor {
  userId?: string;
  guestSessionId?: string;
}

export type CartWithDrafts = carts & {
  ring_design_drafts: (ring_design_drafts & {
    template_variants: {
      standard_size: unknown;
      materials: { name: string };
      ring_templates: { code: string; name: string };
    };
  })[];
};

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveCartByActor(
    actor: FindCartActor,
  ): Promise<CartWithDrafts | null> {
    const where: Record<string, unknown> = {
      status: 'ACTIVE',
    };

    if (actor.userId) {
      where.user_id = actor.userId;
    } else if (actor.guestSessionId) {
      where.guest_session_id = actor.guestSessionId;
    } else {
      return null;
    }

    return this.prisma.carts.findFirst({
      where,
      include: {
        ring_design_drafts: {
          where: { status: 'IN_CART' },
          include: {
            template_variants: {
              include: {
                materials: { select: { name: true } },
                ring_templates: { select: { code: true, name: true } },
              },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });
  }

  createActiveCart(data: {
    userId?: string;
    guestSessionId?: string;
    expiresAt?: Date;
  }): Promise<carts> {
    return this.prisma.carts.create({
      data: {
        user_id: data.userId ?? null,
        guest_session_id: data.guestSessionId ?? null,
        status: 'ACTIVE',
        expires_at: data.expiresAt ?? null,
      },
    });
  }

  findDraftById(draftId: string) {
    return this.prisma.ring_design_drafts.findUnique({
      where: { id: draftId },
      include: {
        carts: true,
        template_variants: {
          include: {
            materials: { select: { name: true } },
            ring_templates: { select: { code: true, name: true } },
          },
        },
      },
    });
  }

  createDraft(data: {
    cartId: string;
    ownerUserId?: string;
    guestSessionId?: string;
    templateVariantId: string;
    targetSize: number;
    gemstoneConfigJson: object;
    personalizationPackage: string;
    memoryEnabled: boolean;
    estimatedPrice: number;
    currency: string;
  }) {
    return this.prisma.ring_design_drafts.create({
      data: {
        cart_id: data.cartId,
        owner_user_id: data.ownerUserId ?? null,
        guest_session_id: data.guestSessionId ?? null,
        template_variant_id: data.templateVariantId,
        target_size: data.targetSize,
        gemstone_config_json: data.gemstoneConfigJson,
        personalization_package: data.personalizationPackage,
        memory_enabled: data.memoryEnabled,
        estimated_price: data.estimatedPrice,
        currency: data.currency,
        estimated_price_at: new Date(),
        status: 'IN_CART',
      },
      include: {
        template_variants: {
          include: {
            materials: { select: { name: true } },
            ring_templates: { select: { code: true, name: true } },
          },
        },
      },
    });
  }

  updateDraft(
    draftId: string,
    data: {
      targetSize?: number;
      personalizationPackage?: string;
      memoryEnabled?: boolean;
      estimatedPrice?: number;
      estimatedPriceAt?: Date;
    },
  ) {
    return this.prisma.ring_design_drafts.update({
      where: { id: draftId },
      data: {
        ...(data.targetSize !== undefined
          ? { target_size: data.targetSize }
          : {}),
        ...(data.personalizationPackage !== undefined
          ? { personalization_package: data.personalizationPackage }
          : {}),
        ...(data.memoryEnabled !== undefined
          ? { memory_enabled: data.memoryEnabled }
          : {}),
        ...(data.estimatedPrice !== undefined
          ? {
              estimated_price: data.estimatedPrice,
              estimated_price_at: data.estimatedPriceAt ?? new Date(),
            }
          : {}),
      },
      include: {
        template_variants: {
          include: {
            materials: { select: { name: true } },
            ring_templates: { select: { code: true, name: true } },
          },
        },
      },
    });
  }

  deleteDraft(draftId: string): Promise<ring_design_drafts> {
    return this.prisma.ring_design_drafts.delete({
      where: { id: draftId },
    });
  }

  updateCartStatus(cartId: string, status: string): Promise<carts> {
    return this.prisma.carts.update({
      where: { id: cartId },
      data: { status },
    });
  }
}
