import type { CaptureAttemptImage } from '@app/contracts';
import type { CaptureAttemptImageResponseDto } from '../dto/capture-attempt-image.response.dto';

/** Explicit public mapping; nothing else from the gRPC message is forwarded. */
export function toCaptureAttemptImageResponse(
  image: CaptureAttemptImage,
): CaptureAttemptImageResponseDto {
  return {
    attemptNo: image.attemptNo,
    imageUrl: image.imageUrl,
    expiresAt: image.expiresAt,
    contentType: image.contentType,
  };
}
