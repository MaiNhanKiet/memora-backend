import type { ListSoundwaveStylesResponse } from '@app/contracts';
import type { SoundwaveStylesResponseDto } from '../dto/soundwave-styles.response.dto';

export function toSoundwaveStylesResponse(
  response: ListSoundwaveStylesResponse,
): SoundwaveStylesResponseDto {
  return {
    defaultStyle: response.defaultStyle,
    styles: (response.styles ?? []).map((style) => ({
      code: style.code,
      name: style.name,
      description: style.description,
      decoder: style.decoder,
      sampleSvg: style.sampleSvg,
    })),
  };
}
