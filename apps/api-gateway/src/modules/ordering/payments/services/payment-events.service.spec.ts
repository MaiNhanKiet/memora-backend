import { Test, TestingModule } from '@nestjs/testing';
import { take } from 'rxjs';
import { PaymentEventsService } from './payment-events.service';

describe('PaymentEventsService', () => {
  let service: PaymentEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentEventsService],
    }).compile();

    service = module.get<PaymentEventsService>(PaymentEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should emit initial connected event on subscription', (done) => {
    const orderId = 'test-order-123';
    service
      .subscribePaymentEvents(orderId)
      .pipe(take(1))
      .subscribe({
        next: (event) => {
          expect(event.type).toBe('connected');
          expect((event.data as Record<string, unknown>).orderId).toBe(orderId);
          done();
        },
        error: (err: unknown) => {
          done(err);
        },
      });
  });

  it('should deliver payment.succeeded event matching orderId', (done) => {
    const targetOrderId = 'order-abc-456';
    const otherOrderId = 'order-xyz-789';

    const sub = service.subscribePaymentEvents(targetOrderId).subscribe({
      next: (event) => {
        if (event.type === 'payment.succeeded') {
          const data = event.data as Record<string, unknown>;
          expect(data.orderId).toBe(targetOrderId);
          expect(data.status).toBe('SUCCEEDED');
          expect(data.transactionId).toBe('tx-999');
          sub.unsubscribe();
          done();
        }
      },
      error: (err) => {
        sub.unsubscribe();
        done(err);
      },
    });

    // Emit event for unrelated order first
    service.emitPaymentSucceeded({
      orderId: otherOrderId,
      transactionId: 'tx-other',
      status: 'SUCCEEDED',
    });

    // Emit event for target order
    service.emitPaymentSucceeded({
      orderId: targetOrderId,
      transactionId: 'tx-999',
      status: 'SUCCEEDED',
    });
  });
});
