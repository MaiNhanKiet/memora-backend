import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  CartActor,
  CartDraftRecord,
  CartRecord,
  CartRepository,
  CreateCartDraftInput,
  DesignShareCodeRecord,
  UpdateCartDraftInput,
} from '../application/cart.repository';

const VARIANT_INCLUDE = {
  include: {
    materials: { select: { name: true } },
    ring_templates: { select: { code: true, name: true } },
  },
} as const;

type DraftWithVariantRow = Prisma.ring_design_draftsGetPayload<{
  include: {
    template_variants: typeof VARIANT_INCLUDE;
  };
}>;

type DraftRow = DraftWithVariantRow & {
  carts?: { user_id: string | null; guest_session_id: string | null } | null;
};

type CartRow = Prisma.cartsGetPayload<{
  include: {
    ring_design_drafts: {
      include: {
        template_variants: typeof VARIANT_INCLUDE;
      };
    };
  };
}>;

function toDraftRecord(row: DraftRow): CartDraftRecord {
  return {
    id: row.id,
    cartId: row.cart_id ?? undefined,
    ownerUserId: row.owner_user_id ?? undefined,
    guestSessionId: row.guest_session_id ?? undefined,
    cartOwnerUserId: row.carts?.user_id ?? undefined,
    cartGuestSessionId: row.carts?.guest_session_id ?? undefined,
    templateVariantId: row.template_variant_id,
    targetSize: Number(row.target_size),
    personalizationPackage: row.personalization_package,
    memoryEnabled: row.memory_enabled,
    gemstoneConfigJson: row.gemstone_config_json,
    estimatedPrice: row.estimated_price ? Number(row.estimated_price) : 0,
    currency: row.currency,
    estimatedPriceAt: row.estimated_price_at ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    variant: row.template_variants
      ? {
          standardSize: Number(row.template_variants.standard_size),
          materialName: row.template_variants.materials.name,
          templateCode: row.template_variants.ring_templates.code,
          templateName: row.template_variants.ring_templates.name,
        }
      : undefined,
  };
}

function toCartRecord(row: CartRow): CartRecord {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    guestSessionId: row.guest_session_id ?? undefined,
    status: row.status,
    expiresAt: row.expires_at ?? undefined,
    drafts: row.ring_design_drafts.map((d) => toDraftRecord(d)),
  };
}

@Injectable()
export class PrismaCartRepository implements CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveCartByActor(
    actor: CartActor,
  ): Promise<CartRecord | undefined> {
    const where: Prisma.cartsWhereInput = { status: 'ACTIVE' };
    if (actor.userId) {
      where.user_id = actor.userId;
    } else if (actor.guestSessionId) {
      where.guest_session_id = actor.guestSessionId;
    } else {
      return undefined;
    }

    const row = await this.prisma.carts.findFirst({
      where,
      include: {
        ring_design_drafts: {
          where: { status: 'IN_CART' },
          include: {
            template_variants: VARIANT_INCLUDE,
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    return row ? toCartRecord(row) : undefined;
  }

  async createActiveCart(data: {
    userId?: string;
    guestSessionId?: string;
    expiresAt?: Date;
  }): Promise<CartRecord> {
    const row = await this.prisma.carts.create({
      data: {
        user_id: data.userId ?? null,
        guest_session_id: data.guestSessionId ?? null,
        status: 'ACTIVE',
        expires_at: data.expiresAt ?? null,
      },
      include: {
        ring_design_drafts: {
          include: {
            template_variants: VARIANT_INCLUDE,
          },
        },
      },
    });

    return toCartRecord(row);
  }

  async findDraftById(draftId: string): Promise<CartDraftRecord | undefined> {
    const row = await this.prisma.ring_design_drafts.findUnique({
      where: { id: draftId },
      include: {
        carts: true,
        template_variants: VARIANT_INCLUDE,
      },
    });

    return row ? toDraftRecord(row) : undefined;
  }

  async createDraft(data: CreateCartDraftInput): Promise<CartDraftRecord> {
    const row = await this.prisma.ring_design_drafts.create({
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
        template_variants: VARIANT_INCLUDE,
      },
    });

    return toDraftRecord(row);
  }

  async updateDraft(
    draftId: string,
    data: UpdateCartDraftInput,
  ): Promise<CartDraftRecord> {
    const row = await this.prisma.ring_design_drafts.update({
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
        ...(data.gemstoneConfigJson !== undefined
          ? { gemstone_config_json: data.gemstoneConfigJson }
          : {}),
        ...(data.estimatedPrice !== undefined
          ? {
              estimated_price: data.estimatedPrice,
              estimated_price_at: data.estimatedPriceAt ?? new Date(),
            }
          : {}),
      },
      include: {
        template_variants: VARIANT_INCLUDE,
      },
    });

    return toDraftRecord(row);
  }

  async deleteDraft(draftId: string): Promise<void> {
    await this.prisma.ring_design_drafts.delete({
      where: { id: draftId },
    });
  }

  async updateCartStatus(cartId: string, status: string): Promise<void> {
    await this.prisma.carts.update({
      where: { id: cartId },
      data: { status },
    });
  }

  async createDesignShareCode(params: {
    draftId: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<DesignShareCodeRecord> {
    const row = await this.prisma.design_codes.create({
      data: {
        ring_design_draft_id: params.draftId,
        code_hash: params.codeHash,
        status: 'ACTIVE',
        expires_at: params.expiresAt,
      },
    });

    return {
      id: row.id,
      ringDesignDraftId: row.ring_design_draft_id,
      status: row.status,
      expiresAt: row.expires_at,
    };
  }

  async findDesignCodeById(
    linkId: string,
    draftId: string,
  ): Promise<DesignShareCodeRecord | undefined> {
    const row = await this.prisma.design_codes.findFirst({
      where: {
        id: linkId,
        ring_design_draft_id: draftId,
      },
    });

    return row
      ? {
          id: row.id,
          ringDesignDraftId: row.ring_design_draft_id,
          status: row.status,
          expiresAt: row.expires_at,
        }
      : undefined;
  }

  async revokeDesignShareCode(linkId: string): Promise<void> {
    await this.prisma.design_codes.update({
      where: { id: linkId },
      data: {
        status: 'REVOKED',
        revoked_at: new Date(),
      },
    });
  }
}
