import { Test, TestingModule } from '@nestjs/testing';
import { SharingController } from './sharing.controller';
import { PlatformSharingGrpcClient } from '../clients/platform-sharing-grpc.client';

describe('SharingController', () => {
  let controller: SharingController;

  const mockGrpcClient = {
    resolveShareLink: jest.fn(),
    createShareLink: jest.fn(),
    revokeShareLink: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SharingController],
      providers: [
        {
          provide: PlatformSharingGrpcClient,
          useValue: mockGrpcClient,
        },
      ],
    }).compile();

    controller = module.get<SharingController>(SharingController);
  });

  describe('resolveShareLink', () => {
    it('should parse sanitized snapshot and return resolved data', async () => {
      mockGrpcClient.resolveShareLink.mockResolvedValue({
        id: '1',
        shareToken: 'memora-3d-xyz',
        status: 'ACTIVE',
        expiresAt: '2026-12-01T00:00:00Z',
        ringTemplateId: 'template-1',
        sanitizedSnapshotJson: JSON.stringify({
          templateCode: 'T_BAND',
          materialCode: 'GOLD_18K',
        }),
        createdAt: '2026-11-24T00:00:00Z',
      });

      const res = await controller.resolveShareLink('memora-3d-xyz');

      expect(res.shareToken).toBe('memora-3d-xyz');
      expect(res.status).toBe('ACTIVE');
      expect(res.sanitizedSnapshot).toEqual({
        templateCode: 'T_BAND',
        materialCode: 'GOLD_18K',
      });
      expect(mockGrpcClient.resolveShareLink).toHaveBeenCalledWith({
        shareToken: 'memora-3d-xyz',
      });
    });
  });

  describe('createShareLink', () => {
    it('should delegate creation to grpc client with actor and stringified snapshot', async () => {
      mockGrpcClient.createShareLink.mockResolvedValue({
        id: 'link-id-123',
        shareToken: 'memora-3d-abc',
        shareUrl: '/api/v1/shares/memora-3d-abc',
        status: 'ACTIVE',
        expiresAt: '2026-12-01T00:00:00Z',
      });

      const res = await controller.createShareLink(
        {
          ringTemplateId: '22222222-2222-2222-2222-222222222222',
          sanitizedSnapshot: { material: 'GOLD_18K' },
          expiresInDays: 7,
        },
        {
          userId: 'user-1',
          roles: ['CUSTOMER'],
          permissions: [],
        },
        undefined,
      );

      expect(res.shareToken).toBe('memora-3d-abc');
      expect(mockGrpcClient.createShareLink).toHaveBeenCalledTimes(1);
    });
  });

  describe('revokeShareLink', () => {
    it('should delegate revoking to grpc client with actor and id', async () => {
      mockGrpcClient.revokeShareLink.mockResolvedValue({
        id: 'link-id-123',
        status: 'REVOKED',
        revokedAt: '2026-11-24T12:00:00Z',
      });

      const res = await controller.revokeShareLink(
        'link-id-123',
        {
          userId: 'user-1',
          roles: ['CUSTOMER'],
          permissions: [],
        },
        undefined,
      );

      expect(res.status).toBe('REVOKED');
      expect(mockGrpcClient.revokeShareLink).toHaveBeenCalledWith(
        expect.objectContaining({
          shareLinkId: 'link-id-123',
        }),
      );
    });
  });
});
