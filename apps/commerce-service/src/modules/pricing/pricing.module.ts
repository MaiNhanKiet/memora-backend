import { Module } from '@nestjs/common';
import { PricingCoreModule } from './pricing-core/pricing-core.module';

@Module({
  imports: [PricingCoreModule],
  exports: [PricingCoreModule],
})
export class PricingModule {}
