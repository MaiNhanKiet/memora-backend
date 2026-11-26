import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateOrderUseCase } from './create-order.use-case';
import { ORDERING_REPOSITORY } from './ordering.repository';

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;

  const mockRepository = {
    findDraftsByIds: jest.fn(),
    createOrderTransaction: jest.fn(),
  };

  const validUserId = '11111111-1111-4111-8111-111111111111';
  const validCustomerIdentityId = '33333333-3333-4333-8333-333333333333';
  const validGuestId = '22222222-2222-4222-8222-222222222222';

  const basePayload = {
    actor: {
      userId: validUserId,
      customerIdentityId: validCustomerIdentityId,
    },
    selectedDraftIds: ['draft-1'],
    fulfillmentMode: 'DELIVERY',
    recipientName: 'Nguyen Van A',
    recipientPhone: '0901234567',
    recipientEmail: 'a@example.com',
    deliveryAddressJson: JSON.stringify({ city: 'HCM' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderUseCase,
        { provide: ORDERING_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<CreateOrderUseCase>(CreateOrderUseCase);
    jest.clearAllMocks();
  });

  it('should throw BadRequestException if actor is missing', async () => {
    await expect(
      useCase.execute({
        ...basePayload,
        actor: {},
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if draft count is not 1 or 2', async () => {
    await expect(
      useCase.execute({
        ...basePayload,
        selectedDraftIds: [],
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      useCase.execute({
        ...basePayload,
        selectedDraftIds: ['d1', 'd2', 'd3'],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if drafts are not found', async () => {
    mockRepository.findDraftsByIds.mockResolvedValue([]);

    await expect(useCase.execute(basePayload)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException if USER actor is missing customerIdentityId', async () => {
    await expect(
      useCase.execute({
        ...basePayload,
        actor: { userId: validUserId },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw ForbiddenException if selected draft belongs to another user', async () => {
    mockRepository.findDraftsByIds.mockResolvedValue([
      {
        id: 'draft-1',
        ownerUserId: '99999999-9999-4999-8999-999999999999',
        personalizationPackage: 'NONE',
      },
    ]);

    await expect(useCase.execute(basePayload)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException if guest checks out personalized ring', async () => {
    mockRepository.findDraftsByIds.mockResolvedValue([
      {
        id: 'draft-1',
        guestSessionId: validGuestId,
        personalizationPackage: 'FINGERPRINT',
      },
    ]);

    await expect(
      useCase.execute({
        ...basePayload,
        actor: { guestSessionId: validGuestId },
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException if personalized ring has no preP1Acknowledgement', async () => {
    mockRepository.findDraftsByIds.mockResolvedValue([
      {
        id: 'draft-1',
        ownerUserId: validUserId,
        personalizationPackage: 'SOUNDWAVE',
      },
    ]);

    await expect(useCase.execute(basePayload)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should create order successfully for personalized ring with AWAITING_P1 and 30% deposit using customerIdentityId', async () => {
    mockRepository.findDraftsByIds.mockResolvedValue([
      {
        id: 'draft-1',
        cartId: 'cart-1',
        ownerUserId: validUserId,
        templateVariantId: 'var-1',
        templateCode: 'T1',
        templateName: 'Ring 1',
        materialName: 'Gold',
        targetSize: 12,
        personalizationPackage: 'FINGERPRINT',
        memoryEnabled: true,
        gemstoneConfigJson: [],
        estimatedPrice: 10000000,
        ringTemplateId: 'tpl-1',
      },
    ]);
    mockRepository.createOrderTransaction.mockResolvedValue({
      orderId: 'order-1',
      orderNo: 'ORD-001',
      status: 'AWAITING_P1',
      sourcePlanMode: 'N/A',
      createdAt: new Date('2026-11-25T10:00:00Z'),
      itemsCount: 1,
      totalAmount: 10000000,
      items: [],
    });

    const res = await useCase.execute({
      ...basePayload,
      preP1Acknowledgement: {
        privacyNoticeAcknowledged: true,
        p1NonrefundAcknowledged: true,
        noticeVersion: 'v1.0',
      },
    });

    expect(mockRepository.createOrderTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerCustomerIdentityId: validCustomerIdentityId,
      }),
    );
    expect(res.orderId).toBe('order-1');
    expect(res.status).toBe('AWAITING_P1');
    expect(res.depositAmount).toBe(3000000);
  });

  it('should create order successfully for all-NONE rings with PENDING_FINAL_QUOTE and 0 deposit', async () => {
    mockRepository.findDraftsByIds.mockResolvedValue([
      {
        id: 'draft-1',
        cartId: 'cart-1',
        cartOwnerUserId: validUserId,
        templateVariantId: 'var-1',
        templateCode: 'T1',
        templateName: 'Ring 1',
        materialName: 'Gold',
        targetSize: 12,
        personalizationPackage: 'NONE',
        memoryEnabled: false,
        gemstoneConfigJson: [],
        estimatedPrice: 5000000,
        ringTemplateId: 'tpl-1',
      },
    ]);
    mockRepository.createOrderTransaction.mockResolvedValue({
      orderId: 'order-2',
      orderNo: 'ORD-002',
      status: 'PENDING_FINAL_QUOTE',
      sourcePlanMode: 'N/A',
      createdAt: new Date('2026-11-25T10:00:00Z'),
      itemsCount: 1,
      totalAmount: 5000000,
      items: [],
    });

    const res = await useCase.execute(basePayload);

    expect(res.orderId).toBe('order-2');
    expect(res.status).toBe('PENDING_FINAL_QUOTE');
    expect(res.depositAmount).toBe(0);
  });
});
