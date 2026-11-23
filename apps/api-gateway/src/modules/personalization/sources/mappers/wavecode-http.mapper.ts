import type { SoundwaveWavecode } from '@app/contracts';
import type { WavecodeResponseDto } from '../dto/wavecode.dto';

/** Explicit public mapping. The preview URLs are short-lived credentials. */
export function toWavecodeResponse(
  response: SoundwaveWavecode,
): WavecodeResponseDto {
  return {
    status: response.status,
    failureCode: response.failureCode ?? null,
    durationMs: response.durationMs ?? null,
    segmentStartMs: response.segmentStartMs ?? null,
    segmentDurationMs: response.segmentDurationMs,
    rawAudioUrl: response.rawAudioUrl ?? null,
    segmentAudioUrl: response.segmentAudioUrl ?? null,
    currentStyle: response.currentStyle,
    acceptedStyle: response.acceptedStyle ?? null,
    styles: (response.styles ?? []).map((style) => ({
      code: style.code,
      name: style.name,
      generated: style.generated,
      previewSvgUrl: style.previewSvgUrl ?? null,
      previewPngUrl: style.previewPngUrl ?? null,
    })),
  };
}
