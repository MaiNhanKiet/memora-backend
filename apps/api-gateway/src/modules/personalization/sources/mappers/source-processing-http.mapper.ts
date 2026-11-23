import type { SourceProcessing } from '@app/contracts';
import type { SourceProcessingResponseDto } from '../dto/source-processing.response.dto';

function emptyToNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === '' ? null : value;
}

/** Explicit public mapping; no keys, checksums, artwork or wavecode. */
export function toSourceProcessingResponse(
  processing: SourceProcessing,
): SourceProcessingResponseDto {
  return {
    sourceId: processing.sourceId,
    sourceType: processing.sourceType,
    status: processing.status,
    failureCode: emptyToNull(processing.failureCode),
    startedAt: emptyToNull(processing.startedAt),
    finishedAt: emptyToNull(processing.finishedAt),
  };
}
