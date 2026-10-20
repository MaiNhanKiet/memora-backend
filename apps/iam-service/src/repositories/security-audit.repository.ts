import { Injectable } from '@nestjs/common';
import { Prisma, type SecurityAuditEvent } from '../../generated/prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';

@Injectable()
export class SecurityAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.SecurityAuditEventUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<SecurityAuditEvent> {
    const db = tx ?? this.prisma;
    return db.securityAuditEvent.create({ data });
  }

  findPageByUserId(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[SecurityAuditEvent[], number]> {
    return this.prisma.$transaction([
      this.prisma.securityAuditEvent.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.securityAuditEvent.count({ where: { userId } }),
    ]);
  }
}
