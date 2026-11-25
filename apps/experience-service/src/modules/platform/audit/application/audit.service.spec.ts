import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditRepository } from '../infrastructure/audit.repository';

describe('AuditService', () => {
  let service: AuditService;

  const mockRepository = {
    listAuditLogs: jest.fn(),
    createAuditLog: jest.fn(),
  };

  const sampleAdminActor = {
    userId: '11111111-1111-4111-8111-111111111111',
  };

  const sampleLog = {
    id: '22222222-2222-4222-8222-222222222222',
    actor_user_id: '11111111-1111-4111-8111-111111111111',
    action: 'USER_ROLE_ASSIGNED',
    entity_type: 'USER',
    entity_id: '33333333-3333-4333-8333-333333333333',
    request_id: 'req-123',
    trace_id: 'trace-456',
    result_status: 'SUCCESS',
    change_summary_json: { role: 'STAFF' },
    metadata_json: { ip: '127.0.0.1' },
    created_at: new Date('2026-11-24T10:00:00Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: AuditRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('listAuditLogs', () => {
    it('should list audit logs with valid filters and pagination', async () => {
      mockRepository.listAuditLogs.mockResolvedValue({
        items: [sampleLog],
        total: 1,
      });

      const res = await service.listAuditLogs({
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

      const res = await service.listAuditLogs({
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
        service.listAuditLogs({
          actor: sampleAdminActor,
          fromDate: 'invalid-date-string',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordAuditEvent', () => {
    it('should record an audit event successfully', async () => {
      mockRepository.createAuditLog.mockResolvedValue(sampleLog);

      const res = await service.recordAuditEvent({
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
        service.recordAuditEvent({
          action: '',
          entityType: 'ORDER',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
