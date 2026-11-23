import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common';
import { PersonalizationGrpcClient } from '../../clients/personalization-grpc.client';
import { ApiListFingerprintFramesDocs } from '../docs/fingerprint-artwork.swagger';
import type { FingerprintFramesResponseDto } from '../dto/fingerprint-artwork.dto';
import { toFingerprintFramesResponse } from '../mappers/fingerprint-artwork-http.mapper';

@ApiTags('fingerprint-artwork')
@Controller('personalization/fingerprint')
export class FingerprintFramesController {
  constructor(
    private readonly personalizationClient: PersonalizationGrpcClient,
  ) {}

  // [PERSO-036] GET /api/v1/personalization/fingerprint/frames
  @Public()
  @Get('frames')
  @ApiListFingerprintFramesDocs()
  async listFrames(): Promise<FingerprintFramesResponseDto> {
    return toFingerprintFramesResponse(
      await this.personalizationClient.listFingerprintFrames(),
    );
  }
}
