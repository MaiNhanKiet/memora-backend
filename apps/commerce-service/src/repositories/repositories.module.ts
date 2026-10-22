import { Module } from '@nestjs/common';
import { PrismaModule } from '../persistence/prisma/prisma.module';
import { RingTemplateRepository } from './ring-template.repository';

@Module({
  imports: [PrismaModule],
  providers: [RingTemplateRepository],
  exports: [RingTemplateRepository],
})
export class RepositoriesModule {}
