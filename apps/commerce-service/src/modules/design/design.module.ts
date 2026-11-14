import { Module } from '@nestjs/common';
import { CartGrpcController } from '../../presentation/grpc/cart.grpc.controller';
import { CartService } from '../../application/cart/cart.service';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [RepositoriesModule, PricingModule],
  controllers: [CartGrpcController],
  providers: [CartService],
  exports: [CartService],
})
export class DesignModule {}
