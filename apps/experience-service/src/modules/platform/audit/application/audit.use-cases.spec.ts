import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AUDIT_REPOSITORY, type AuditLogRecord } from './audit.repository';
import {
  ListAuditLogsUseCase,
  RecordAuditEventUseCase,
} from './audit.use-cases';

describe('Audit UseCases', () => {
  let listAuditLogsUseCase: ListAuditLogsUseCase;
  let recordAuditEventUseCase: RecordAuditEventUseCase;

  const mockRepository = {
    listAuditLogs: jest.fn(),
    createAuditLog: jest.fn(),
  };

  const sampleAdminActor = {
    userId: '11111111-1111-4111-8111-111111111111',
  };

  const sampleLog: AuditLogRecord = {
    id: '22222222-2222-4222-8222-222222222222',
    actorUserId: '11111111-1111-4111-8111-111111111111',
    action: 'USER_ROLE_ASSIGNED',
    entityType: 'USER',
    entityId: '33333333-3333-4333-8333-333333333333',
    requestId: 'req-123',
    traceId: 'trace-456',
    resultStatus: 'SUCCESS',
    changeSummaryJson: { role: 'STAFF' },
    metadataJson: { ip: '127.0.0.1' },
    createdAt: new Date('2026-11-24T10:00:00Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAuditLogsUseCase,
        RecordAuditEventUseCase,
        { provide: AUDIT_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    listAuditLogsUseCase =
      module.get<ListAuditLogsUseCase>(ListAuditLogsUseCase);
    recordAuditEventUseCase = module.get<RecordAuditEventUseCase>(
      RecordAuditEventUseCase,
    );
  });

  describe('ListAuditLogsUseCase', () => {
    it('should list audit logs with valid filters and pagination', async () => {
      mockRepository.listAuditLogs.mockResolvedValue({
        items: [sampleLog],
        total: 1,
      });

      const res = await listAuditLogsUseCase.execute({
        actor: sampleAdminActor,
        entityType: 'USER',
        action: 'USER_ROLE_ASSIGNED',
        page: 1,
        limit: 20,
      });

      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
      expect(res.totalPages).toBe(1);
      expect(res.items[0].action).toBe('USER_ROLE_ASSIGNED');
      expect(mockRepository.listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'USER',
          action: 'USER_ROLE_ASSIGNED',
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should filter by fromDate and toDate correctly', async () => {
      mockRepository.listAuditLogs.mockResolvedValue({
        items: [],
        total: 0,
      });

      const res = await listAuditLogsUseCase.execute({
        actor: sampleAdminActor,
        fromDate: '2026-11-01T00:00:00.000Z',
        toDate: '2026-11-30T23:59:59.999Z',
      });

      expect(res.items).toHaveLength(0);
      expect(mockRepository.listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: new Date('2026-11-01T00:00:00.000Z'),
          toDate: new Date('2026-11-30T23:59:59.999Z'),
        }),
      );
    });

    it('should throw BadRequestException if fromDate is invalid', async () => {
      await expect(
        listAuditLogsUseCase.execute({
          actor: sampleAdminActor,
          fromDate: 'invalid-date-string',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('RecordAuditEventUseCase', () => {
    it('should record an audit event successfully', async () => {
      mockRepository.createAuditLog.mockResolvedValue(sampleLog);

      const res = await recordAuditEventUseCase.execute({
        actorUserId: '11111111-1111-4111-8111-111111111111',
        action: 'ORDER_PAID',
        entityType: 'ORDER',
        entityId: '44444444-4444-4444-8444-444444444444',
        changeSummaryJson: JSON.stringify({ amount: 5000000 }),
        metadataJson: JSON.stringify({ gateway: 'VNPAY' }),
      });

      expect(res.id).toBe(sampleLog.id);
      expect(mockRepository.createAuditLog).toHaveBeenCalledTimes(1);
      expect(mockRepository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ORDER_PAID',
          entityType: 'ORDER',
          changeSummaryJson: { amount: 5000000 },
        }),
      );
    });

    it('should throw BadRequestException if action or entityType is missing', async () => {
      await expect(
        recordAuditEventUseCase.execute({
          action: '',
          entityType: 'ORDER',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
