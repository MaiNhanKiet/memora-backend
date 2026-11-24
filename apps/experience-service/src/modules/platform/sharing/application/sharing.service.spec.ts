import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { Prisma } from '../../../../../generated/prisma/client';
import { SharingService } from './sharing.service';
import { SharingRepository } from '../infrastructure/sharing.repository';

interface CreateShareLinkRepoParams {
  createdByUserId?: string | null;
  guestSessionId?: string | null;
  ringDesignDraftId?: string | null;
  ringTemplateId?: string | null;
  tokenHash: string;
  sanitizedSnapshotJson: Prisma.InputJsonValue;
  expiresAt: Date;
}

describe('SharingService', () => {
  let service: SharingService;

  const mockRepository = {
    findByTokenHash: jest.fn(),
    findById: jest.fn(),
    createShareLink: jest.fn(),
    revokeShareLink: jest.fn(),
    updateLastAccessed: jest.fn().mockResolvedValue(undefined),
  };

  const sampleUserActor = {
    userId: '11111111-1111-4111-8111-111111111111',
  };

  const sampleGuestActor = {
    guestSessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharingService,
        {
          provide: SharingRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SharingService>(SharingService);
  });

  describe('resolveShareLink', () => {
    const rawToken = 'memora-3d-testtoken123';
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const activeLink = {
      id: '22222222-2222-4222-8222-222222222222',
      token_hash: tokenHash,
      status: 'ACTIVE',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ring_template_id: '33333333-3333-4333-8333-333333333333',
      ring_design_draft_id: null,
      sanitized_snapshot_json: {
        templateCode: 'T_TEST_BAND',
        materialCode: 'GOLD_18K_YELLOW',
      },
      created_at: new Date('2026-11-24T10:00:00Z'),
    };

    it('should resolve active share link successfully', async () => {
      mockRepository.findByTokenHash.mockResolvedValue(activeLink);

      const res = await service.resolveShareLink({ shareToken: rawToken });

      expect(res.shareToken).toBe(rawToken);
      expect(res.status).toBe('ACTIVE');
      expect(res.ringTemplateId).toBe(activeLink.ring_template_id);
      expect(mockRepository.updateLastAccessed).toHaveBeenCalledWith(
        activeLink.id,
      );
    });

    it('should throw NotFoundException if token hash does not exist', async () => {
      mockRepository.findByTokenHash.mockResolvedValue(null);

      await expect(
        service.resolveShareLink({ shareToken: 'unknown-token' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if status is not ACTIVE', async () => {
      mockRepository.findByTokenHash.mockResolvedValue({
        ...activeLink,
        status: 'REVOKED',
      });

      await expect(
        service.resolveShareLink({ shareToken: rawToken }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if link has expired', async () => {
      mockRepository.findByTokenHash.mockResolvedValue({
        ...activeLink,
        expires_at: new Date(Date.now() - 1000),
      });

      await expect(
        service.resolveShareLink({ shareToken: rawToken }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createShareLink', () => {
    it('should create a share link for registered user', async () => {
      mockRepository.createShareLink.mockImplementation(
        (data: CreateShareLinkRepoParams) =>
          Promise.resolve({
            id: '55555555-5555-4555-8555-555555555555',
            created_by_user_id: data.createdByUserId,
            guest_session_id: null,
            token_hash: data.tokenHash,
            status: 'ACTIVE',
            sanitized_snapshot_json: data.sanitizedSnapshotJson,
            expires_at: data.expiresAt,
            created_at: new Date(),
          }),
      );

      const res = await service.createShareLink({
        actor: sampleUserActor,
        ringTemplateId: '33333333-3333-4333-8333-333333333333',
        sanitizedSnapshotJson: JSON.stringify({
          templateCode: 'T_TEST_BAND',
        }),
        expiresInDays: 7,
      });

      expect(res.status).toBe('ACTIVE');
      expect(res.shareToken).toContain('memora-3d-');
      expect(mockRepository.createShareLink).toHaveBeenCalledTimes(1);
    });

    it('should create a share link for guest session', async () => {
      mockRepository.createShareLink.mockImplementation(
        (data: CreateShareLinkRepoParams) =>
          Promise.resolve({
            id: '66666666-6666-4666-8666-666666666666',
            created_by_user_id: null,
            guest_session_id: data.guestSessionId,
            token_hash: data.tokenHash,
            status: 'ACTIVE',
            sanitized_snapshot_json: data.sanitizedSnapshotJson,
            expires_at: data.expiresAt,
            created_at: new Date(),
          }),
      );

      const res = await service.createShareLink({
        actor: sampleGuestActor,
        sanitizedSnapshotJson: JSON.stringify({
          templateCode: 'T_GUEST_BAND',
        }),
      });

      expect(res.status).toBe('ACTIVE');
      expect(res.shareToken).toContain('memora-3d-');
      expect(mockRepository.createShareLink).toHaveBeenCalledWith(
        expect.objectContaining({
          guestSessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        }),
      );
    });

    it('should throw BadRequestException if actor has neither user nor guest session', async () => {
      await expect(
        service.createShareLink({
          actor: {},
          sanitizedSnapshotJson: '{}',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeShareLink', () => {
    const existingLink = {
      id: '77777777-7777-4777-8777-777777777777',
      created_by_user_id: sampleUserActor.userId,
      guest_session_id: null,
      status: 'ACTIVE',
      revoked_at: null,
    };

    it('should allow owner to revoke share link', async () => {
      mockRepository.findById.mockResolvedValue(existingLink);
      mockRepository.revokeShareLink.mockResolvedValue({
        ...existingLink,
        status: 'REVOKED',
        revoked_at: new Date(),
      });

      const res = await service.revokeShareLink({
        actor: sampleUserActor,
        shareLinkId: existingLink.id,
      });

      expect(res.status).toBe('REVOKED');
      expect(mockRepository.revokeShareLink).toHaveBeenCalledWith(
        existingLink.id,
      );
    });

    it('should throw ForbiddenException if another user attempts to revoke', async () => {
      mockRepository.findById.mockResolvedValue(existingLink);

      await expect(
        service.revokeShareLink({
          actor: { userId: '99999999-9999-4999-8999-999999999999' },
          shareLinkId: existingLink.id,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if link does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.revokeShareLink({
          actor: sampleUserActor,
          shareLinkId: 'non-existent-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
