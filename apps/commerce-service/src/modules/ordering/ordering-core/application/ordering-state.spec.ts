import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  assertOrderCancellable,
  assertValidOrderStatusTransition,
  resolveAllNoneFinalQuoteVersions,
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

  describe('resolveAllNoneFinalQuoteVersions', () => {
    const ready = {
      id: 'ring-1',
      version: {
        id: 'version-1',
        ringItemId: 'ring-1',
        status: 'REVIEW_NOT_REQUIRED',
        personalizationPackage: 'NONE',
      },
    };

    it('captures the current version of every ready ring in an All-NONE order', () => {
      expect(
        resolveAllNoneFinalQuoteVersions(
          'PENDING_FINAL_QUOTE',
          'PENDING_FINAL_QUOTE',
          [
            ready,
            {
              id: 'ring-2',
              version: {
                ...ready.version,
                id: 'version-2',
                ringItemId: 'ring-2',
              },
            },
          ],
        ),
      ).toEqual({ 'ring-1': 'version-1', 'ring-2': 'version-2' });
    });

    it('rejects an All-NONE order at the wrong status', () => {
      expect(() =>
        resolveAllNoneFinalQuoteVersions('CANCELLED', 'PENDING_FINAL_QUOTE', [
          ready,
        ]),
      ).toThrow(ConflictException);
    });

    it.each([
      ['missing', null],
      [
        'not ready',
        { ...ready.version, ringItemId: 'ring-2', status: 'DRAFT' },
      ],
      ['for a different ring', ready.version],
    ])(
      'rejects the order when a second current version is %s',
      (_case, version) => {
        expect(() =>
          resolveAllNoneFinalQuoteVersions(
            'AWAITING_FINAL_CONFIRMATION',
            'AWAITING_FINAL_CONFIRMATION',
            [ready, { id: 'ring-2', version }],
          ),
        ).toThrow(ConflictException);
      },
    );

    it('leaves personalized orders to their separate workflow', () => {
      expect(
        resolveAllNoneFinalQuoteVersions(
          'DESIGN_IN_PROGRESS',
          'PENDING_FINAL_QUOTE',
          [
            ready,
            {
              id: 'ring-2',
              version: {
                ...ready.version,
                ringItemId: 'ring-2',
                personalizationPackage: 'FINGERPRINT',
              },
            },
          ],
        ),
      ).toBeUndefined();
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

    it('keeps settled P1 credit visible after the provisional quote expires', () => {
      const now = new Date('2026-11-27T12:00:00Z');
      const expiredOrder = {
        ...order,
        status: 'AWAITING_P1',
        createdAt: new Date('2026-11-26T00:00:00Z'),
        currentQuote: {
          ...quote,
          quoteType: 'PROVISIONAL',
          status: 'ISSUED',
          validUntil: new Date('2026-11-27T00:00:00Z'),
        },
      };

      expect(
        resolveOrderNextPayment(
          expiredOrder,
          [{ ...deposit, quoteId: quote.id }],
          now,
        ),
      ).toMatchObject({
        stage: 'DEPOSIT_P1',
        paidAmount: deposit.amount,
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
