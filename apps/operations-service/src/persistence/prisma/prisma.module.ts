import { Global, Module } from '@nestjs/common';
import { OperationsDatabaseService } from './operations-database.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [OperationsDatabaseService, PrismaService],
  exports: [OperationsDatabaseService, PrismaService],
})
export class PrismaModule {}
