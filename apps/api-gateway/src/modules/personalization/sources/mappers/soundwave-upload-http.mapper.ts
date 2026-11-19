import type {
  CompleteSoundwaveUploadResponse,
  InitiateSoundwaveUploadResponse,
} from '@app/contracts';
import type {
  CompleteSoundwaveUploadResponseDto,
  InitiateSoundwaveUploadResponseDto,
} from '../dto/soundwave-upload.response.dto';

/** Explicit public mapping. No object keys, checksums or metadata. */
export function toInitiateSoundwaveUploadResponse(
  response: InitiateSoundwaveUploadResponse,
): InitiateSoundwaveUploadResponseDto {
  return {
    uploadId: response.uploadId,
    uploadUrl: response.uploadUrl,
    uploadHeaders: { ...response.uploadHeaders },
    expiresAt: response.expiresAt,
  };
}

export function toCompleteSoundwaveUploadResponse(
  response: CompleteSoundwaveUploadResponse,
): CompleteSoundwaveUploadResponseDto {
  return {
    sourceId: response.sourceId,
    sourceType: response.sourceType,
    status: response.status,
  };
}
