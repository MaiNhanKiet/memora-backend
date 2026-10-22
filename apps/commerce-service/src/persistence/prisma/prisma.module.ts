import { Module } from '@nestjs/common';
import { CommerceDatabaseService } from './commerce-database.service';

@Module({
  providers: [CommerceDatabaseService],
  exports: [CommerceDatabaseService],
})
export class PrismaModule {}
