import { Module } from '@nestjs/common';
import { PricingGrpcController } from './presentation/pricing.grpc.controller';
import { PricingService } from './application/pricing.service';
import { PricingMapper } from './application/pricing.mapper';
import { PricingRepository } from './infrastructure/pricing.repository';

@Module({
  controllers: [PricingGrpcController],
  providers: [PricingService, PricingMapper, PricingRepository],
  exports: [PricingService, PricingMapper, PricingRepository],
})
export class PricingCoreModule {}
