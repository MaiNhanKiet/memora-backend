import { Module } from '@nestjs/common';
import { PricingGrpcController } from '../../presentation/grpc/pricing.grpc.controller';
import { PricingService } from '../../application/pricing/pricing.service';
import { RepositoriesModule } from '../../repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [PricingGrpcController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
