import * as readline from 'node:readline';
import { TestHttpClient } from './http-client';

export interface PayosPaymentInfo {
  orderId: string;
  transactionId?: string;
  orderCode?: number | string;
  paymentStage: string;
  amount: number;
  checkoutUrl?: string;
  qrCode?: string;
}

export class PayosInteractiveHelper {
  static displayPaymentPrompt(info: PayosPaymentInfo): void {
    console.log('\n================================================================================');
    console.log('🚨 [HUMAN-IN-THE-LOOP] YÊU CẦU QUÉT MÃ QR THANH TOÁN THẬT (PAYOS)');
    console.log('================================================================================');
    console.log(`- Mã đơn hàng (Order ID)   : ${info.orderId}`);
    console.log(`- Giai đoạn thanh toán     : ${info.paymentStage}`);
    console.log(`- Số tiền cần thanh toán   : ${info.amount.toLocaleString('vi-VN')} VND`);
    if (info.orderCode) {
      console.log(`- Mã giao dịch PayOS       : ${info.orderCode}`);
    }
    if (info.checkoutUrl) {
      console.log(`- Link mở cổng PayOS       : \x1b[36m${info.checkoutUrl}\x1b[0m`);
    }
    if (info.qrCode) {
      console.log(`- Mã VietQR Data / Link    : ${info.qrCode}`);
    }
    console.log('--------------------------------------------------------------------------------');
    console.log('👉 HƯỚNG DẪN DÀNH CHO BẠN:');
    console.log('  1. Mở link trên trình duyệt HOẶC dùng App Ngân hàng quét mã QR thanh toán.');
    console.log('  2. Hoàn tất chuyển tiền trên PayOS Sandbox.');
    console.log('  3. PayOS sẽ gọi Webhook thật về backend để tự động kích hoạt chuyển trạng thái.');
    console.log('================================================================================\n');
  }

  static async waitForUserConfirmation(promptText: string = 'Nhấn [ENTER] sau khi bạn đã quét mã và hoàn tất thanh toán...'): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(`\x1b[33m⏳ ${promptText}\x1b[0m `, () => {
        rl.close();
        resolve();
      });
    });
  }

  /**
   * Chờ giao dịch chuyển sang trạng thái SUCCEEDED / PAID thông qua Webhook IPN hoặc Reconcile trực tiếp
   */
  static async pollPaymentStatus(
    client: TestHttpClient,
    orderId: string,
    transactionId?: string,
    adminToken?: string,
    maxWaitSeconds: number = 180,
  ): Promise<boolean> {
    const startTime = Date.now();
    console.log(`[PayOS-Monitor] Đang giám sát trạng thái thanh toán PayOS (tối đa ${maxWaitSeconds}s)...`);

    while ((Date.now() - startTime) / 1000 < maxWaitSeconds) {
      // 1. Kiểm tra trạng thái hiện tại qua API
      const url = transactionId
        ? `/api/v1/orders/${orderId}/payments/${transactionId}`
        : `/api/v1/orders/${orderId}/payments`;

      const res = await client.get<{ status?: string; data?: { status?: string }; items?: Array<{ status: string }> }>(url);
      const status = (res.data as any)?.data?.status || res.data?.status;

      if (status === 'SUCCEEDED') {
        console.log('\x1b[32m✔ [PayOS-Monitor] Webhook đã nhận! Giao dịch đạt trạng thái SUCCEEDED.\x1b[0m');
        return true;
      }

      // 2. Thử Reconcile trực tiếp với máy chủ PayOS (phòng trường hợp Webhook IPN bị delay)
      if (transactionId && adminToken) {
        const originalToken = client.getToken();
        client.setToken(adminToken);
        const reconcileRes = await client.post<{ status?: string; data?: { status?: string } }>(
          `/api/v1/admin/payments/${transactionId}/reconcile`,
          {},
        );
        client.setToken(originalToken);

        const recStatus = (reconcileRes.data as any)?.data?.status || reconcileRes.data?.status;
        if (recStatus === 'SUCCEEDED') {
          console.log('\x1b[32m✔ [PayOS-Monitor] Reconcile thành công từ máy chủ PayOS! Giao dịch SUCCEEDED.\x1b[0m');
          return true;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    console.log('\x1b[31m✖ [PayOS-Monitor] Quá thời gian chờ thanh toán (Timeout).\x1b[0m');
    return false;
  }
}
