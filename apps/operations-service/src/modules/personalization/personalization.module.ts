import { Module } from '@nestjs/common';
import { ConsentModule } from './consent/consent.module';
import { FingerprintCaptureModule } from './fingerprint-capture/fingerprint-capture.module';
import { SourcesModule } from './sources/sources.module';

@Module({
  imports: [ConsentModule, FingerprintCaptureModule, SourcesModule],
})
export class PersonalizationModule {}
