import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { GemstoneSelectionItem } from '@app/contracts';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import { validateGemstoneSlotSelections } from '../../../catalog/catalog-core/application/gemstone-selection.validation';
import { availableCertifiedGemstones } from '../../../inventory/inventory-core/infrastructure/prisma-certified-gemstone-allocations';
import type {
  CartActor,
  CartDraftRecord,
  CartRecord,
  CartRepository,
  CreateCartDraftInput,
  DesignShareCodeRecord,
  UpdateCartDraftInput,
  ValidatedGemstoneSelection,
} from '../application/cart.repository';

export async function resolveGemstoneSelections(
  db: Prisma.TransactionClient,
  variantId: string,
  selections: readonly GemstoneSelectionItem[],
  at = new Date(),
): Promise<ValidatedGemstoneSelection[]> {
  const optionIds = selections.map(({ gemstoneOptionId }) =>
    gemstoneOptionId.toLowerCase(),
  );
  const certifiedIds = selections.flatMap(({ certifiedGemstoneId }) =>
    certifiedGemstoneId ? [certifiedGemstoneId.toLowerCase()] : [],
  );
  if (new Set(certifiedIds).size !== certifiedIds.length) {
    throw new BadRequestException(
      'A certified gemstone can only be selected once',
    );
  }
  const variant = await db.template_variants.findFirst({
    where: {
      id: variantId,
      status: 'ACTIVE',
      ring_templates: { status: 'ACTIVE' },
      materials: { status: 'ACTIVE' },
    },
    select: {
      ring_templates: {
        select: {
          gemstone_groups: {
            select: {
              id: true,
              is_required: true,
              gemstone_slots: { select: { id: true, slot_index: true } },
            },
          },
        },
      },
    },
  });
  if (!variant)
    throw new BadRequestException(
      'The ring template or variant is no longer active',
    );

  const compatibilities = optionIds.length
    ? await db.template_compatibilities.findMany({
        where: {
          template_variant_id: variantId,
          gemstone_option_id: { in: optionIds },
          gemstone_options: { status: 'ACTIVE' },
        },
        select: {
          gemstone_option_id: true,
          gemstone_group_id: true,
          gemstone_options: { select: { certified_required: true } },
        },
      })
    : [];
  const slots = variant.ring_templates.gemstone_groups.flatMap((group) =>
    group.gemstone_slots.map((slot) => ({
      id: slot.id,
      slotIndex: slot.slot_index,
      gemstoneGroupId: group.id,
      isRequired: group.is_required,
    })),
  );
  const { slotIds, errors } = validateGemstoneSlotSelections(
    slots,
    compatibilities.map((option) => ({
      gemstoneOptionId: option.gemstone_option_id,
      gemstoneGroupId: option.gemstone_group_id,
    })),
    selections,
  );
  if (errors[0]) throw new BadRequestException(errors[0].message);

  const gems = certifiedIds.length
    ? await db.certified_gemstones.findMany({
        where: {
          id: { in: certifiedIds },
          ...availableCertifiedGemstones(at),
        },
        select: { id: true, gemstone_option_id: true },
      })
    : [];
  const prices = certifiedIds.length
    ? await db.price_versions.findMany({
        where: {
          status: 'ACTIVE',
          currency: 'VND',
          OR: [{ effective_from: null }, { effective_from: { lte: at } }],
          AND: [{ OR: [{ effective_to: null }, { effective_to: { gt: at } }] }],
          price_items: {
            price_type: 'CERTIFIED_GEMSTONE',
            certified_gemstone_id: { in: certifiedIds },
            status: 'ACTIVE',
          },
        },
        select: {
          id: true,
          amount: true,
          price_items: { select: { certified_gemstone_id: true } },
        },
      })
    : [];

  return selections.map(({ gemstoneOptionId, certifiedGemstoneId }, index) => {
    const optionId = gemstoneOptionId.toLowerCase();
    const slotId = slotIds[index];
    const requiresCertificate = compatibilities.some(
      (option) =>
        option.gemstone_option_id === optionId &&
        option.gemstone_options.certified_required,
    );
    if (requiresCertificate !== Boolean(certifiedGemstoneId)) {
      throw new BadRequestException(
        'Select an exact inventory gemstone only for a certified option',
      );
    }
    if (!certifiedGemstoneId) return { slotId, optionId };
    const certifiedId = certifiedGemstoneId.toLowerCase();
    const gem = gems.find(({ id }) => id === certifiedId);
    if (!gem || gem.gemstone_option_id !== optionId) {
      throw new ConflictException(
        'Selected certified gemstone is unavailable or does not match the option',
      );
    }
    const price = prices.find(
      ({ price_items }) => price_items.certified_gemstone_id === certifiedId,
    );
    if (!price)
      throw new ConflictException(
        'Selected certified gemstone has no active price',
      );
    return {
      slotId,
      optionId,
      certifiedGemstoneId: certifiedId,
      priceVersionId: price.id,
      certifiedPrice: Number(price.amount),
    };
  });
}

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

  validateGemstoneSelections(
    variantId: string,
    selections: readonly GemstoneSelectionItem[],
  ): Promise<ValidatedGemstoneSelection[]> {
    return resolveGemstoneSelections(this.prisma, variantId, selections);
  }

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
      where: { id: draftId, status: 'IN_CART' },
      data: {
        updated_at: new Date(),
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
