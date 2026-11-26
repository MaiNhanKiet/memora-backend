import { Prisma } from '../../../../../generated/prisma/client';
import type { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  OrderingRingItemDetailRecord,
  OrderingRingItemVersionRecord,
} from '../application/ordering.repository';
import { toGemstoneDetailRecords } from './prisma-ordering.mappers';

export class PrismaOrderingRingItemsDelegate {
  constructor(private readonly prisma: PrismaService) {}

  async findRingItemWithDetails(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<OrderingRingItemDetailRecord | undefined> {
    const order = await this.prisma.orders.findFirst({
      where: {
        id: orderId,
        OR: [
          { owner_customer_identity_id: actorId },
          ...(guestEmail ? [{ guest_email: guestEmail }] : []),
        ],
      },
    });
    if (!order) {
      return undefined;
    }

    const item = await this.prisma.ring_items.findFirst({
      where: { id: ringItemId, order_id: orderId },
      include: {
        ring_item_versions_ring_items_current_version_idToring_item_versions: {
          include: {
            template_variants: {
              include: {
                materials: { select: { name: true } },
                ring_templates: { select: { code: true, name: true } },
              },
            },
            ring_item_version_gemstones: {
              include: {
                gemstone_slots: true,
                gemstone_options: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      return undefined;
    }

    const ver =
      item.ring_item_versions_ring_items_current_version_idToring_item_versions;
    const maintenancePlan =
      typeof ver?.preview_snapshot_json === 'object' &&
      ver?.preview_snapshot_json !== null &&
      'maintenancePlan' in ver.preview_snapshot_json &&
      typeof ver.preview_snapshot_json.maintenancePlan === 'string'
        ? ver.preview_snapshot_json.maintenancePlan
        : undefined;

    return {
      id: item.id,
      orderId: item.order_id,
      itemNo: item.item_no,
      sourceRingDesignDraftId: item.source_ring_design_draft_id,
      currentVersionId: item.current_version_id ?? undefined,
      versionNo: ver?.version_no ?? 1,
      templateVariantId: ver?.template_variants.id ?? '',
      templateCode: ver?.template_variants.ring_templates.code ?? '',
      templateName: ver?.template_variants.ring_templates.name ?? '',
      materialName: ver?.template_variants.materials.name ?? '',
      targetSize: Number(ver?.target_size ?? 0),
      personalizationPackage: ver?.personalization_package ?? 'NONE',
      memoryEnabled: ver?.memory_enabled ?? false,
      maintenancePlan,
      gemstones: toGemstoneDetailRecords(
        ver?.ring_item_version_gemstones ?? [],
      ),
      createdAt: item.created_at,
    };
  }

  async listRingItemVersions(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<OrderingRingItemVersionRecord[] | undefined> {
    const order = await this.prisma.orders.findFirst({
      where: {
        id: orderId,
        OR: [
          { owner_customer_identity_id: actorId },
          ...(guestEmail ? [{ guest_email: guestEmail }] : []),
        ],
      },
    });
    if (!order) {
      return undefined;
    }

    const ringItem = await this.prisma.ring_items.findFirst({
      where: { id: ringItemId, order_id: orderId },
    });
    if (!ringItem) {
      return undefined;
    }

    const versions = await this.prisma.ring_item_versions.findMany({
      where: { ring_item_id: ringItemId },
      orderBy: { version_no: 'asc' },
      include: {
        template_variants: {
          include: {
            materials: { select: { name: true } },
            ring_templates: { select: { code: true, name: true } },
          },
        },
        ring_item_version_gemstones: {
          include: {
            gemstone_slots: true,
            gemstone_options: true,
          },
        },
      },
    });

    return versions.map((ver) => ({
      id: ver.id,
      versionNo: ver.version_no,
      status: ver.status,
      targetSize: Number(ver.target_size),
      personalizationPackage: ver.personalization_package,
      memoryEnabled: ver.memory_enabled,
      changeReason: ver.change_reason ?? undefined,
      templateVariantId: ver.template_variants.id,
      templateCode: ver.template_variants.ring_templates.code,
      templateName: ver.template_variants.ring_templates.name,
      materialName: ver.template_variants.materials.name,
      gemstones: toGemstoneDetailRecords(ver.ring_item_version_gemstones),
      createdAt: ver.created_at,
    }));
  }

  async findCurrentRingItemVersion(
    orderId: string,
    ringItemId: string,
    actorId: string,
    guestEmail?: string,
  ): Promise<{ id: string; status: string } | undefined> {
    const order = await this.prisma.orders.findFirst({
      where: {
        id: orderId,
        OR: [
          { owner_customer_identity_id: actorId },
          ...(guestEmail ? [{ guest_email: guestEmail }] : []),
        ],
      },
    });
    if (!order) {
      return undefined;
    }

    const ringItem = await this.prisma.ring_items.findFirst({
      where: { id: ringItemId, order_id: orderId },
      include: {
        ring_item_versions_ring_items_current_version_idToring_item_versions: {
          select: { id: true, status: true },
        },
      },
    });

    if (!ringItem || !ringItem.current_version_id) {
      return undefined;
    }

    return (
      ringItem.ring_item_versions_ring_items_current_version_idToring_item_versions ??
      undefined
    );
  }

  async updateCurrentRingItemVersion(
    versionId: string,
    data: {
      targetSize?: number;
      changeReason?: string;
      memoryEnabled?: boolean;
    },
  ): Promise<{
    id: string;
    versionNo: number;
    status: string;
    targetSize: number;
    changeReason?: string;
    createdAt: Date;
  }> {
    const updateData: Prisma.ring_item_versionsUpdateInput = {
      ...(data.targetSize !== undefined
        ? { target_size: new Prisma.Decimal(data.targetSize) }
        : {}),
      ...(data.changeReason !== undefined
        ? { change_reason: data.changeReason }
        : {}),
      ...(data.memoryEnabled !== undefined
        ? { memory_enabled: data.memoryEnabled }
        : {}),
    };

    const updated = await this.prisma.ring_item_versions.update({
      where: { id: versionId },
      data: updateData,
    });

    return {
      id: updated.id,
      versionNo: updated.version_no,
      status: updated.status,
      targetSize: Number(updated.target_size),
      changeReason: updated.change_reason ?? undefined,
      createdAt: updated.created_at,
    };
  }
}
