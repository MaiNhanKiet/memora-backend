import { Module } from '@nestjs/common';
import { PricingGrpcController } from '../../presentation/grpc/pricing.grpc.controller';
import { PricingService } from '../../application/pricing/pricing.service';
import { PricingMapper } from '../../application/pricing/pricing.mapper';
import { RepositoriesModule } from '../../repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [PricingGrpcController],
  providers: [PricingService, PricingMapper],
  exports: [PricingService, PricingMapper],
})
export class PricingModule {}
