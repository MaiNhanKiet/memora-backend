import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { OperationsReadinessService } from './readiness.service';

const SERVING = 1;
const NOT_SERVING = 2;

@Controller()
export class GrpcHealthController {
  constructor(private readonly readiness: OperationsReadinessService) {}

  @GrpcMethod('Health', 'Check')
  async check(): Promise<{ status: number }> {
    const ready = await this.readiness.isReady();
    return { status: ready ? SERVING : NOT_SERVING };
  }
}
