import { Module } from '@nestjs/common';
import { ConsentModule } from './consent/consent.module';
import { FingerprintCaptureModule } from './fingerprint-capture/fingerprint-capture.module';

@Module({
  imports: [ConsentModule, FingerprintCaptureModule],
})
export class PersonalizationModule {}
