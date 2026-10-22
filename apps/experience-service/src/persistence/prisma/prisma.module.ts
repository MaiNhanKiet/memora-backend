import { Module } from '@nestjs/common';
import { ExperienceDatabaseService } from './experience-database.service';

@Module({
  providers: [ExperienceDatabaseService],
  exports: [ExperienceDatabaseService],
})
export class PrismaModule {}
