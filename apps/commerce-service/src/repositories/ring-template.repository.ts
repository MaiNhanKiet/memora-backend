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
}
