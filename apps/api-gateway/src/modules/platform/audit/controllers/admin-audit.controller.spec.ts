import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuditController } from './admin-audit.controller';
import { PlatformAuditGrpcClient } from '../clients/platform-audit-grpc.client';

describe('AdminAuditController', () => {
  let controller: AdminAuditController;

  const mockGrpcClient = {
    listAuditLogs: jest.fn(),
    recordAuditEvent: jest.fn(),
  };

  const sampleAdmin = {
    userId: '11111111-1111-4111-8111-111111111111',
    roles: ['ADMIN'],
    permissions: ['IAM_SECURITY_AUDIT_READ'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuditController],
      providers: [
        {
          provide: PlatformAuditGrpcClient,
          useValue: mockGrpcClient,
        },
      ],
    }).compile();

    controller = module.get<AdminAuditController>(AdminAuditController);
  });

  describe('listAuditLogs', () => {
    it('should map query parameters and return paginated audit logs', async () => {
      mockGrpcClient.listAuditLogs.mockResolvedValue({
        items: [
          {
            id: 'log-1',
            actorUserId: 'user-1',
            action: 'USER_ROLE_ASSIGNED',
            entityType: 'USER',
            entityId: 'user-2',
            requestId: 'req-1',
            traceId: 'trace-1',
            resultStatus: 'SUCCESS',
            changeSummaryJson: JSON.stringify({ role: 'MANAGER' }),
            metadataJson: JSON.stringify({ ip: '192.168.1.1' }),
            createdAt: '2026-11-24T12:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const res = await controller.listAuditLogs(
        {
          action: 'USER_ROLE_ASSIGNED',
          page: 1,
          limit: 20,
        },
        sampleAdmin,
      );

      expect(res.items).toHaveLength(1);
      expect(res.items[0].action).toBe('USER_ROLE_ASSIGNED');
      expect(res.items[0].changeSummary).toEqual({ role: 'MANAGER' });
      expect(res.items[0].metadata).toEqual({ ip: '192.168.1.1' });
      expect(res.meta.total).toBe(1);
      expect(mockGrpcClient.listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_ROLE_ASSIGNED',
          page: 1,
          limit: 20,
        }),
      );
    });
  });
});
