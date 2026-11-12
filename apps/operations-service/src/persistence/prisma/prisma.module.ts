import { Module } from '@nestjs/common';
import { OperationsDatabaseService } from './operations-database.service';

@Module({
  providers: [OperationsDatabaseService],
  exports: [OperationsDatabaseService],
})
export class PrismaModule {}
