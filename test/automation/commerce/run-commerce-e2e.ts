import { TestHttpClient } from './core/http-client';
import { TestReporter } from './core/assertions';
import { TEST_ACTORS } from './config/test-actors';
import { testConfig } from './config/env.config';
import { runPhase0, Phase0Context } from './flows/phase0-admin-setup';
import { runPhase1, Phase1Context } from './flows/phase1-mf01-order-p1';
import { runPhase2, Phase2Context } from './flows/phase2-mf02-final-quote-p2';
import { runPhase3, Phase3Context } from './flows/phase3-mf03-handover-invoice';
import { runPhase4, Phase4Context } from './flows/phase4-mf04-after-sales';

async function authenticateActor(client: TestHttpClient, email: string, password?: string): Promise<string | null> {
  if (!password) {
    // Thử tạo Guest Session nếu không có mật khẩu
    try {
      const guestRes = await client.post<{ accessToken?: string; data?: { accessToken?: string } }>('/api/v1/identities/guest/sessions', {});
      if (guestRes.status === 201) {
        return guestRes.data.data?.accessToken || guestRes.data.accessToken || null;
      }
    } catch {
      // Ignored
    }
    return null;
  }

  try {
    const loginRes = await client.post<{ accessToken?: string; data?: { accessToken?: string } }>('/api/v1/auth/login', {
      email,
      password,
    });
    if (loginRes.status === 200) {
      const token = loginRes.data.data?.accessToken || loginRes.data.accessToken || null;
      return token;
    }
  } catch (err) {
    console.warn(`[Auth] Không thể đăng nhập trực tiếp tài khoản ${email}: ${(err as Error).message}`);
  }
  return null;
}

async function main(): Promise<void> {
  console.log('================================================================================');
  console.log('🚀 MEMORA COMMERCE SERVICE — AUTOMATION TEST SUITE (80 APIS)');
  console.log('================================================================================');
  console.log(`- Base Gateway URL : ${testConfig.baseUrl}`);
  console.log(`- Webhook URL      : ${testConfig.payosWebhookUrl}`);
  console.log(`- Mode             : Live End-to-End (Zero Fake Webhook)`);
  console.log('================================================================================\n');

  const args = process.argv.slice(2);
  const skipInteractivePayment = args.includes('--skip-payos-prompt') || process.env.CI === 'true';

  const client = new TestHttpClient();

  // 1. Xác thực tài khoản Admin & Customer
  console.log('🔑 Đang kiểm tra đăng nhập tài khoản kiểm thử...');
  const adminToken = await authenticateActor(client, TEST_ACTORS.admin.email, TEST_ACTORS.admin.password);
  const customerToken = await authenticateActor(client, TEST_ACTORS.customer.email, TEST_ACTORS.customer.password);

  if (adminToken) {
    console.log('\x1b[32m✔ Đăng nhập tài khoản Admin thành công.\x1b[0m');
  } else {
    console.log('\x1b[33m⚠ Không thể đăng nhập Admin qua API Gateway. Tiếp tục với mock actor/guest nếu Gateway cho phép.\x1b[0m');
  }

  // 2. Chạy Phase 0: Master Data & Admin Setup (24 APIs)
  client.setToken(adminToken);
  const phase0Ctx: Phase0Context = {};
  await runPhase0(client, phase0Ctx);

  // 3. Chạy Phase 1: MF01 — Ring Config, Cart, Order Creation & Cọc P1 PayOS (26 APIs)
  client.setToken(customerToken || adminToken);
  const phase1Ctx: Phase1Context = {
    templateId: phase0Ctx.templateId || '00000000-0000-0000-0000-000000000001',
    materialId: phase0Ctx.materialId,
    variantId: phase0Ctx.variantId,
    adminToken: adminToken ?? undefined,
  };
  await runPhase1(client, phase1Ctx, skipInteractivePayment);

  // 4. Chạy Phase 2: MF02 — Final Quote, Customer Confirm & Production Lock (12 APIs)
  const phase2Ctx: Phase2Context = {
    orderId: phase1Ctx.orderId || '00000000-0000-0000-0000-000000000011',
    ringItemId: phase1Ctx.ringItemId,
    quoteId: phase1Ctx.provisionalQuoteId,
    stockLotId: phase0Ctx.stockLotId,
    adminToken: adminToken ?? undefined,
    customerToken: customerToken ?? undefined,
  };
  await runPhase2(client, phase2Ctx);

  // 5. Chạy Phase 3: MF03 — Full Payment, Invoice & Completion (11 APIs)
  const phase3Ctx: Phase3Context = {
    orderId: phase1Ctx.orderId || '00000000-0000-0000-0000-000000000011',
    cancelOrderId: phase1Ctx.cancelOrderId,
    transactionId: phase1Ctx.p1TransactionId,
    allocationId: phase2Ctx.allocationId,
    releaseAllocationId: phase2Ctx.releaseAllocationId,
    adminToken: adminToken ?? undefined,
    customerToken: customerToken ?? undefined,
  };
  await runPhase3(client, phase3Ctx);

  // 6. Chạy Phase 4: MF04 — After-sales Claims, Warranty & Refund (7 APIs)
  const phase4Ctx: Phase4Context = {
    transactionId: phase1Ctx.p1TransactionId,
    gemstoneOptionId: phase0Ctx.gemstoneOptionId,
    stockLotId: phase0Ctx.stockLotId,
    adminToken: adminToken ?? undefined,
    customerToken: customerToken ?? undefined,
  };
  await runPhase4(client, phase4Ctx);

  // 7. Tổng hợp và in báo cáo kết quả kiểm thử
  TestReporter.printSummaryTable();
}

main().catch((err) => {
  console.error('\x1b[31m[LỖI NGHIÊM TRỌNG TRONG QUÁ TRÌNH THỰC THI TEST SUITE]:\x1b[0m', err);
  process.exit(1);
});
