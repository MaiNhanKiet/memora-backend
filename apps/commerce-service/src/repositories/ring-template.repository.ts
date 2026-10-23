import { Injectable } from '@nestjs/common';
import type { RingTemplate, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';

@Injectable()
export class RingTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<RingTemplate | null> {
    return this.prisma.ringTemplate.findUnique({
      where: { id },
    });
  }

  async findManyPaginated(input: {
    status?: string;
    stoneLayout?: string;
    package?: string;
    skip: number;
    take: number;
  }): Promise<{ rows: RingTemplate[]; total: number }> {
    const where: Prisma.RingTemplateWhereInput = {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.stoneLayout !== undefined
        ? { stoneLayout: input.stoneLayout }
        : {}),
      ...(input.package !== undefined
        ? {
            designSupportedPersonalizationPackages: {
              has: input.package,
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.ringTemplate.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ringTemplate.count({ where }),
    ]);

    return { rows, total };
  }

  async findConfigurationOptionsByTemplateId(templateId: string) {
    const template = await this.prisma.ringTemplate.findUnique({
      where: { id: templateId },
      include: {
        variants: {
          where: { status: 'ACTIVE' },
          include: { material: true },
          orderBy: { standardSize: 'asc' },
        },
        gemstoneGroups: {
          include: {
            slots: {
              orderBy: { slotIndex: 'asc' },
            },
          },
          orderBy: { sequenceNo: 'asc' },
        },
      },
    });

    if (template === null || template.status !== 'ACTIVE') {
      return null;
    }

    const compatibilities = await this.prisma.templateCompatibility.findMany({
      where: {
        gemstoneGroup: {
          ringTemplateId: templateId,
        },
      },
      include: {
        gemstoneOption: true,
      },
    });

    return {
      template,
      compatibilities,
    };
  }

  async find3DAssetsByTemplateId(templateId: string) {
    return this.prisma.ringTemplate.findFirst({
      where: {
        id: templateId,
        status: 'ACTIVE',
      },
      include: {
        gemstoneGroups: {
          orderBy: { sequenceNo: 'asc' },
          include: {
            slots: {
              orderBy: { slotIndex: 'asc' },
            },
          },
        },
      },
    });
  }
}

