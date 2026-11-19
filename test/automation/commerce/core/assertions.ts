export interface ApiTestResult {
  code: string;
  name: string;
  phase: string;
  passed: boolean;
  httpStatus: number;
  durationMs: number;
  error?: string;
}

export class TestReporter {
  private static results: ApiTestResult[] = [];

  static record(result: ApiTestResult): void {
    this.results.push(result);
    const statusIcon = result.passed ? '\x1b[32m✔ PASS\x1b[0m' : '\x1b[31m✖ FAIL\x1b[0m';
    const duration = `(${result.durationMs}ms)`;
    console.log(`  [${result.code}] ${statusIcon} [${result.httpStatus}] ${result.name} ${duration}`);
    if (result.error) {
      console.log(`      \x1b[31m→ Lỗi: ${result.error}\x1b[0m`);
    }
  }

  static getSummary(): { total: number; passed: number; failed: number } {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    return { total, passed, failed };
  }

  static printSummaryTable(): void {
    const summary = this.getSummary();
    console.log('\n================================================================================');
    console.log('📊 BÁO CÁO TỔNG HỢP KIỂM THỬ AUTOMATION COMMERCE SERVICE (80 APIS)');
    console.log('================================================================================');
    console.log(`- Tổng số API đã kiểm thử : ${summary.total}`);
    console.log(`- Số lượng API ĐẠT (PASS) : \x1b[32m${summary.passed}\x1b[0m`);
    console.log(`- Số lượng API LỖI (FAIL) : ${summary.failed > 0 ? `\x1b[31m${summary.failed}\x1b[0m` : '0'}`);
    console.log('--------------------------------------------------------------------------------');

    const byPhase: Record<string, { total: number; passed: number }> = {};
    for (const r of this.results) {
      if (!byPhase[r.phase]) {
        byPhase[r.phase] = { total: 0, passed: 0 };
      }
      byPhase[r.phase].total += 1;
      if (r.passed) byPhase[r.phase].passed += 1;
    }

    for (const [phase, stat] of Object.entries(byPhase)) {
      console.log(`• ${phase.padEnd(35)} : ${stat.passed}/${stat.total} APIs PASS`);
    }
    console.log('================================================================================\n');
  }
}
