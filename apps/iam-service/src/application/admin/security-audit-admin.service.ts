import { Injectable, NotFoundException } from '@nestjs/common';
import {
  computeTotalPages,
  getPaginationOffset,
  normalizePagination,
} from '@app/common';
import type { Prisma } from '../../../generated/prisma/client';
import { SecurityAuditRepository } from '../../repositories/security-audit.repository';
import { UserRepository } from '../../repositories/user.repository';

const BLOCKED_METADATA_KEY =
  /(email|password|token|otp|cookie|secret|authorization|body)/i;
const SECRET_VALUE =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/i;

export type SecurityAuditEventItem = {
  id: string;
  action: string;
  outcome: string;
  createdAt: string;
  metadataJson: string;
};

@Injectable()
export class SecurityAuditAdminService {
  constructor(
    private readonly users: UserRepository,
    private readonly events: SecurityAuditRepository,
  ) {}

  async listUserEvents(input: {
    userId: string;
    page?: number;
    limit?: number;
  }): Promise<{
    events: SecurityAuditEventItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { page, limit } = normalizePagination(input);
    const { skip, take } = getPaginationOffset(page, limit);
    const [rows, total] = await this.events.findPageByUserId(
      input.userId,
      skip,
      take,
    );
    return {
      events: rows.map((row) => ({
        id: row.id,
        action: row.action,
        outcome: row.outcome,
        createdAt: row.createdAt.toISOString(),
        metadataJson: JSON.stringify(publicMetadata(row.metadata)),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: computeTotalPages(total, limit),
      },
    };
  }
}

function publicMetadata(value: Prisma.JsonValue): Record<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const safe: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string') {
      continue;
    }
    if (BLOCKED_METADATA_KEY.test(key) || SECRET_VALUE.test(entry)) {
      continue;
    }
    safe[key] = entry;
  }
  return safe;
}
