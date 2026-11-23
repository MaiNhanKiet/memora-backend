import { Module } from '@nestjs/common';
import { ConsentModule } from './consent/consent.module';
import { FingerprintCaptureModule } from './fingerprint-capture/fingerprint-capture.module';
import { SourcesModule } from './sources/sources.module';
import { SoundwaveUploadModule } from './soundwave-upload/soundwave-upload.module';

@Module({
  imports: [
    ConsentModule,
    FingerprintCaptureModule,
    SourcesModule,
    SoundwaveUploadModule,
  ],
})
export class PersonalizationModule {}
