import { Module } from '@nestjs/common';
import { CartGrpcController } from './presentation/cart.grpc.controller';
import { CartService } from './application/cart.service';
import { CartRepository } from './infrastructure/cart.repository';
import { PricingModule } from '../../pricing/pricing.module';

@Module({
  imports: [PricingModule],
  controllers: [CartGrpcController],
  providers: [CartService, CartRepository],
  exports: [CartService, CartRepository],
})
export class CartModule {}
