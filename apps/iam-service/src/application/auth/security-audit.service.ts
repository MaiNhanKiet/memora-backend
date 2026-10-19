import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { SecurityAuditRepository } from '../../repositories/security-audit.repository';
import { securityAuditData, type SecurityAuditAction } from './security-audit';

@Injectable()
export class SecurityAuditService {
  constructor(private readonly events: SecurityAuditRepository) {}

  record(
    input: {
      userId: string;
      action: SecurityAuditAction;
      metadata?: Readonly<Record<string, string>>;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<unknown> {
    return this.events.create(securityAuditData(input), tx);
  }
}
