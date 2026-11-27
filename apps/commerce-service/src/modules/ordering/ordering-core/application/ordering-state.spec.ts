import { BadRequestException } from '@nestjs/common';
import {
  assertOrderCancellable,
  assertValidOrderStatusTransition,
  resolveOrderNextPayment,
  resolveOrderStageGates,
} from './ordering-state';

describe('ordering-state', () => {
  describe('assertValidOrderStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(() =>
        assertValidOrderStatusTransition('AWAITING_P1', 'CANCELLED'),
      ).not.toThrow();
      expect(() =>
        assertValidOrderStatusTransition('MANUFACTURING', 'READY_FOR_DELIVERY'),
      ).not.toThrow();
    });

    it('should throw BadRequestException for invalid transitions', () => {
      expect(() =>
        assertValidOrderStatusTransition('DELIVERED', 'CANCELLED'),
      ).toThrow(BadRequestException);
      expect(() =>
        assertValidOrderStatusTransition('AWAITING_P1', 'DELIVERED'),
      ).toThrow(BadRequestException);
    });
  });

  describe('assertOrderCancellable', () => {
    it('should allow pre-production statuses and reject post-production', () => {
      expect(() => assertOrderCancellable('AWAITING_P1')).not.toThrow();
      expect(() => assertOrderCancellable('PENDING_FINAL_QUOTE')).not.toThrow();
      expect(() => assertOrderCancellable('IN_PRODUCTION')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('resolveOrderStageGates', () => {
    it('should mark P1 and personalization skipped for PENDING_FINAL_QUOTE', () => {
      const gates = resolveOrderStageGates(
        'PENDING_FINAL_QUOTE',
        '2026-11-25T00:00:00Z',
        false,
      );
      expect(gates.find((g) => g.stageCode === 'DEPOSIT_P1')?.status).toBe(
        'SKIPPED',
      );
      expect(
        gates.find((g) => g.stageCode === 'FINAL_QUOTE_APPROVAL')?.isCurrent,
      ).toBe(true);
    });
  });

  describe('resolveOrderNextPayment', () => {
    const quote = {
      id: 'q-1',
      quoteNo: 'F1',
      quoteType: 'FINAL',
      status: 'ACCEPTED',
      currency: 'VND',
      totalAmount: 10000000,
      subtotalAmount: 10000000,
      deliveryAmount: 0,
      adjustmentAmount: 0,
    };
    const order = {
      id: 'order-1',
      orderNo: 'ORDER-1',
      status: 'AWAITING_P2',
      ownerCustomerIdentityId: 'customer-1',
      sourcePlanMode: 'N/A',
      currentQuote: quote,
      ringItems: [
        {
          id: 'ring-1',
          itemNo: 1,
          sourceRingDesignDraftId: 'draft-1',
          versionNo: 1,
          templateVariantId: 'tv-1',
          templateCode: 'TC',
          templateName: 'Template',
          materialName: 'Gold',
          targetSize: 10,
          personalizationPackage: 'FINGERPRINT',
          memoryEnabled: false,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const deposit = {
      id: 'p1',
      paymentStage: 'DEPOSIT_P1',
      transactionType: 'PAYMENT',
      amount: 3500000,
      currency: 'VND',
      status: 'SUCCEEDED',
      requestedAt: new Date(),
    };

    it('charges only the gap to 70% and blocks a new payment when already paid', () => {
      expect(resolveOrderNextPayment(order, [deposit])).toMatchObject({
        stage: 'MILESTONE_P2',
        amountDue: 3500000,
        canPay: true,
      });
      expect(
        resolveOrderNextPayment(order, [{ ...deposit, amount: 8000000 }]),
      ).toMatchObject({
        stage: 'MILESTONE_P2',
        amountDue: 0,
        canPay: false,
      });
    });

    it('does not offer payment while waiting for the final quote', () => {
      expect(
        resolveOrderNextPayment(
          { ...order, status: 'PENDING_FINAL_QUOTE' },
          [],
        ),
      ).toBeUndefined();
    });

    it('charges the actual final balance net of settled refunds', () => {
      expect(
        resolveOrderNextPayment({ ...order, status: 'READY_FOR_HANDOVER' }, [
          { ...deposit, amount: 7700000 },
          {
            ...deposit,
            id: 'refund',
            transactionType: 'REFUND',
            relatedTransactionId: deposit.id,
            amount: 500000,
          },
        ]),
      ).toMatchObject({ stage: 'FINAL_P3', amountDue: 2800000 });
    });
  });
});
