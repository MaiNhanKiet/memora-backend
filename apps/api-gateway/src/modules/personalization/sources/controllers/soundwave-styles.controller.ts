import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common';
import { PersonalizationGrpcClient } from '../../clients/personalization-grpc.client';
import { ApiListSoundwaveStylesDocs } from '../docs/soundwave-styles.swagger';
import type { SoundwaveStylesResponseDto } from '../dto/soundwave-styles.response.dto';
import { toSoundwaveStylesResponse } from '../mappers/soundwave-styles-http.mapper';

@ApiTags('soundwave-upload')
@Controller('personalization/soundwave')
export class SoundwaveStylesController {
  constructor(
    private readonly personalizationClient: PersonalizationGrpcClient,
  ) {}

  // [PERSO-031] GET /api/v1/personalization/soundwave/styles
  @Public()
  @Get('styles')
  @ApiListSoundwaveStylesDocs()
  async listStyles(): Promise<SoundwaveStylesResponseDto> {
    return toSoundwaveStylesResponse(
      await this.personalizationClient.listSoundwaveStyles({}),
    );
  }
}
