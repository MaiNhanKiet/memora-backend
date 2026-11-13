import { Module } from '@nestjs/common';
import { CatalogRepository } from './catalog.repository';
import { PrismaModule } from '../persistence/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CatalogRepository],
  exports: [CatalogRepository],
})
export class RepositoriesModule {}
