import { BadRequestException } from '@nestjs/common';
import {
  assertOrderCancellable,
  assertValidOrderStatusTransition,
  resolveNextOrderStatusAfterPayment,
  resolveOrderStageGates,
  resolvePaymentStageForOrderStatus,
} from './ordering-state';

describe('ordering-state', () => {
  describe('assertValidOrderStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(() =>
        assertValidOrderStatusTransition('AWAITING_P1', 'PENDING_FINAL_QUOTE'),
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
      );
      expect(gates.find((g) => g.stageCode === 'DEPOSIT_P1')?.status).toBe(
        'SKIPPED',
      );
      expect(
        gates.find((g) => g.stageCode === 'FINAL_QUOTE_APPROVAL')?.isCurrent,
      ).toBe(true);
    });
  });

  describe('payment stage & next status helpers', () => {
    it('should resolve payment stage from order status', () => {
      expect(resolvePaymentStageForOrderStatus('AWAITING_P1')).toBe(
        'DEPOSIT_P1',
      );
      expect(resolvePaymentStageForOrderStatus('AWAITING_P2')).toBe(
        'MILESTONE_P2',
      );
      expect(() => resolvePaymentStageForOrderStatus('DELIVERED')).toThrow(
        BadRequestException,
      );
    });

    it('should resolve next order status after payment', () => {
      expect(resolveNextOrderStatusAfterPayment('DEPOSIT_P1')).toBe(
        'PENDING_FINAL_QUOTE',
      );
      expect(resolveNextOrderStatusAfterPayment('MILESTONE_P2')).toBe(
        'MANUFACTURING',
      );
      expect(
        resolveNextOrderStatusAfterPayment('FINAL_P3', 'READY_FOR_DELIVERY'),
      ).toBe('DELIVERING');
    });
  });
});
