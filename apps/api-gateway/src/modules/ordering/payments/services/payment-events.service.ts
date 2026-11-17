import { Injectable, Logger } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable, Subject, filter, map, merge, timer } from 'rxjs';

export interface PaymentSucceededEvent {
  orderId: string;
  transactionId?: string;
  status: string;
  amount?: number;
  paymentStage?: string;
}

@Injectable()
export class PaymentEventsService {
  private readonly logger = new Logger(PaymentEventsService.name);
  private readonly paymentSubject = new Subject<PaymentSucceededEvent>();

  emitPaymentSucceeded(event: PaymentSucceededEvent): void {
    this.logger.log(
      `Emitting payment.succeeded event for order ${event.orderId}, tx: ${event.transactionId ?? 'unknown'}`,
    );
    this.paymentSubject.next(event);
  }

  subscribePaymentEvents(orderId: string): Observable<MessageEvent> {
    // 1. Initial event on connection established
    const initial$: Observable<MessageEvent> = timer(0).pipe(
      map(() => ({
        type: 'connected',
        data: {
          message: `Listening for payment events for order ${orderId}`,
          orderId,
          timestamp: new Date().toISOString(),
        },
      })),
    );

    // 2. Heartbeat ping every 25 seconds to keep connection alive through proxies
    const heartbeat$: Observable<MessageEvent> = timer(25000, 25000).pipe(
      map(() => ({
        type: 'ping',
        data: { timestamp: new Date().toISOString() },
      })),
    );

    // 3. Payment succeeded event filtered specifically for this orderId
    const payment$: Observable<MessageEvent> = this.paymentSubject.asObservable().pipe(
      filter((event) => event.orderId === orderId),
      map((event) => ({
        type: 'payment.succeeded',
        data: {
          orderId: event.orderId,
          transactionId: event.transactionId,
          status: event.status,
          amount: event.amount,
          paymentStage: event.paymentStage,
          timestamp: new Date().toISOString(),
        },
      })),
    );

    return merge(initial$, heartbeat$, payment$);
  }
}
