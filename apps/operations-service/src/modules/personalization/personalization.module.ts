import { Module } from '@nestjs/common';
import { ConsentModule } from './consent/consent.module';

@Module({
  imports: [ConsentModule],
})
export class PersonalizationModule {}
