import { Global, Module } from '@nestjs/common';
import { ExperienceDatabaseService } from './experience-database.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [ExperienceDatabaseService, PrismaService],
  exports: [ExperienceDatabaseService, PrismaService],
})
export class PrismaModule {}
