import { BadRequestException } from '@nestjs/common';
import type { ShareLinkStatus } from '@app/contracts';

const SNAPSHOT_WHITELIST_KEYS = [
  'templateCode',
  'templateName',
  'materialCode',
  'materialName',
  'glbAssetKey',
  'glbUrl',
  'gemstones',
  'ringSize',
  'engravingPreview',
] as const;

export function sanitize3DSnapshot(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BadRequestException('Invalid sanitized snapshot JSON');
  }
  const source = raw as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  for (const key of SNAPSHOT_WHITELIST_KEYS) {
    if (
      Object.prototype.hasOwnProperty.call(source, key) &&
      source[key] !== undefined
    ) {
      sanitized[key] = source[key];
    }
  }
  return sanitized;
}

export function toShareLinkStatus(status: string): ShareLinkStatus {
  if (status === 'ACTIVE' || status === 'REVOKED' || status === 'EXPIRED') {
    return status;
  }
  throw new Error(`Unexpected share link status: ${status}`);
}
