import { Global, Module } from '@nestjs/common';
import { CommerceDatabaseService } from './commerce-database.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [CommerceDatabaseService, PrismaService],
  exports: [CommerceDatabaseService, PrismaService],
})
export class PrismaModule {}
