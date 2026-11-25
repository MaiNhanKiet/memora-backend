import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import {
  SHARING_REPOSITORY,
  type CreateShareLinkInput,
  type ShareLinkRecord,
} from './sharing.repository';
import {
  CreateShareLinkUseCase,
  ResolveShareLinkUseCase,
  RevokeShareLinkUseCase,
} from './sharing.use-cases';
import { sanitize3DSnapshot } from './sharing.validation';

describe('Sharing UseCases', () => {
  let resolveShareLinkUseCase: ResolveShareLinkUseCase;
  let createShareLinkUseCase: CreateShareLinkUseCase;
  let revokeShareLinkUseCase: RevokeShareLinkUseCase;

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
        ResolveShareLinkUseCase,
        CreateShareLinkUseCase,
        RevokeShareLinkUseCase,
        { provide: SHARING_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    resolveShareLinkUseCase = module.get<ResolveShareLinkUseCase>(
      ResolveShareLinkUseCase,
    );
    createShareLinkUseCase = module.get<CreateShareLinkUseCase>(
      CreateShareLinkUseCase,
    );
    revokeShareLinkUseCase = module.get<RevokeShareLinkUseCase>(
      RevokeShareLinkUseCase,
    );
  });

  describe('ResolveShareLinkUseCase', () => {
    const rawToken = 'memora-3d-testtoken123';
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const activeLink: ShareLinkRecord = {
      id: '22222222-2222-4222-8222-222222222222',
      tokenHash,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ringTemplateId: '33333333-3333-4333-8333-333333333333',
      sanitizedSnapshotJson: {
        templateCode: 'T_TEST_BAND',
        materialCode: 'GOLD_18K_YELLOW',
      },
      createdAt: new Date('2026-11-24T10:00:00Z'),
    };

    it('should resolve active share link successfully', async () => {
      mockRepository.findByTokenHash.mockResolvedValue(activeLink);

      const res = await resolveShareLinkUseCase.execute({
        shareToken: rawToken,
      });

      expect(res.shareToken).toBe(rawToken);
      expect(res.status).toBe('ACTIVE');
      expect(res.ringTemplateId).toBe(activeLink.ringTemplateId);
      expect(mockRepository.updateLastAccessed).toHaveBeenCalledWith(
        activeLink.id,
      );
    });

    it('should throw NotFoundException if token hash does not exist', async () => {
      mockRepository.findByTokenHash.mockResolvedValue(undefined);

      await expect(
        resolveShareLinkUseCase.execute({ shareToken: 'unknown-token' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if status is not ACTIVE', async () => {
      mockRepository.findByTokenHash.mockResolvedValue({
        ...activeLink,
        status: 'REVOKED',
      });

      await expect(
        resolveShareLinkUseCase.execute({ shareToken: rawToken }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if link has expired', async () => {
      mockRepository.findByTokenHash.mockResolvedValue({
        ...activeLink,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        resolveShareLinkUseCase.execute({ shareToken: rawToken }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('CreateShareLinkUseCase', () => {
    it('should create a share link for registered user', async () => {
      mockRepository.createShareLink.mockImplementation(
        (data: CreateShareLinkInput): Promise<ShareLinkRecord> =>
          Promise.resolve({
            id: '55555555-5555-4555-8555-555555555555',
            createdByUserId: data.createdByUserId,
            tokenHash: data.tokenHash,
            status: 'ACTIVE',
            sanitizedSnapshotJson: data.sanitizedSnapshotJson,
            expiresAt: data.expiresAt,
            createdAt: new Date(),
          }),
      );

      const res = await createShareLinkUseCase.execute({
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
        (data: CreateShareLinkInput): Promise<ShareLinkRecord> =>
          Promise.resolve({
            id: '66666666-6666-4666-8666-666666666666',
            guestSessionId: data.guestSessionId,
            tokenHash: data.tokenHash,
            status: 'ACTIVE',
            sanitizedSnapshotJson: data.sanitizedSnapshotJson,
            expiresAt: data.expiresAt,
            createdAt: new Date(),
          }),
      );

      const res = await createShareLinkUseCase.execute({
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
        createShareLinkUseCase.execute({
          actor: {},
          sanitizedSnapshotJson: '{}',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should strip sensitive fields from snapshot using whitelist', () => {
      const sanitized = sanitize3DSnapshot({
        templateCode: 'T_TEST',
        materialCode: 'GOLD_18K',
        ringSize: 12,
        price: 9999999,
        email: 'secret@example.com',
        phone: '0901234567',
        userId: 'user-123',
      });

      expect(sanitized).toEqual({
        templateCode: 'T_TEST',
        materialCode: 'GOLD_18K',
        ringSize: 12,
      });
      expect(sanitized).not.toHaveProperty('price');
      expect(sanitized).not.toHaveProperty('email');
      expect(sanitized).not.toHaveProperty('phone');
      expect(sanitized).not.toHaveProperty('userId');
    });
  });

  describe('RevokeShareLinkUseCase', () => {
    const existingLink: ShareLinkRecord = {
      id: '77777777-7777-4777-8777-777777777777',
      createdByUserId: sampleUserActor.userId,
      tokenHash: 'hash-1',
      status: 'ACTIVE',
      createdAt: new Date('2026-11-24T10:00:00Z'),
    };

    it('should allow owner to revoke share link', async () => {
      mockRepository.findById.mockResolvedValue(existingLink);
      mockRepository.revokeShareLink.mockResolvedValue({
        ...existingLink,
        status: 'REVOKED',
        revokedAt: new Date(),
      });

      const res = await revokeShareLinkUseCase.execute({
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
        revokeShareLinkUseCase.execute({
          actor: { userId: '99999999-9999-4999-8999-999999999999' },
          shareLinkId: existingLink.id,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if link does not exist', async () => {
      mockRepository.findById.mockResolvedValue(undefined);

      await expect(
        revokeShareLinkUseCase.execute({
          actor: sampleUserActor,
          shareLinkId: 'non-existent-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
