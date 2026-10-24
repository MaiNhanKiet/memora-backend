import { Injectable } from '@nestjs/common';
import type { ring_templates, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';

@Injectable()
export class RingTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ring_templates | null> {
    return this.prisma.ring_templates.findUnique({
      where: { id },
    });
  }

  async findManyPaginated(input: {
    status?: string;
    stoneLayout?: string;
    package?: string;
    skip: number;
    take: number;
  }): Promise<{ rows: ring_templates[]; total: number }> {
    const where: Prisma.ring_templatesWhereInput = {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.stoneLayout !== undefined
        ? { stone_layout: input.stoneLayout }
        : {}),
      ...(input.package !== undefined
        ? {
            design_supported_personalization_packages: {
              has: input.package,
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.ring_templates.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.ring_templates.count({ where }),
    ]);

    return { rows, total };
  }

  async findConfigurationOptionsByTemplateId(templateId: string) {
    const template = await this.prisma.ring_templates.findUnique({
      where: { id: templateId },
      include: {
        template_variants: {
          where: { status: 'ACTIVE' },
          include: { materials: true },
          orderBy: { standard_size: 'asc' },
        },
        gemstone_groups: {
          include: {
            gemstone_slots: {
              orderBy: { slot_index: 'asc' },
            },
          },
          orderBy: { sequence_no: 'asc' },
        },
      },
    });

    if (template === null || template.status !== 'ACTIVE') {
      return null;
    }

    const compatibilities = await this.prisma.template_compatibilities.findMany({
      where: {
        gemstone_groups: {
          ring_template_id: templateId,
        },
      },
      include: {
        gemstone_options: true,
      },
    });

    return {
      template,
      compatibilities,
    };
  }

  async find3DAssetsByTemplateId(templateId: string) {
    return this.prisma.ring_templates.findFirst({
      where: {
        id: templateId,
        status: 'ACTIVE',
      },
      include: {
        gemstone_groups: {
          orderBy: { sequence_no: 'asc' },
          include: {
            gemstone_slots: {
              orderBy: { slot_index: 'asc' },
            },
          },
        },
      },
    });
  }
}


