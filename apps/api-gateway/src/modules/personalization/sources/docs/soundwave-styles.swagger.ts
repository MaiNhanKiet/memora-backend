import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { SoundwaveStylesResponseDto } from '../dto/soundwave-styles.response.dto';

export function ApiListSoundwaveStylesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-031] List WAVECODE visual styles (public)',
      description:
        'No authentication. The styles (CLASSIC, HAIRLINE, OSCILLOSCOPE) come from the processing worker and are cached by Operations for 10 minutes. Send the chosen code as wavecodeStyle in PERSO-010 complete; it defaults to defaultStyle.',
    }),
    ApiSuccessResponse({
      type: SoundwaveStylesResponseDto,
      description: 'Available styles',
    }),
    ApiServiceUnavailableResponse({
      description:
        'The processing worker is unavailable and no cached list exists (PROCESSING_WORKER_UNAVAILABLE)',
    }),
  );
}
