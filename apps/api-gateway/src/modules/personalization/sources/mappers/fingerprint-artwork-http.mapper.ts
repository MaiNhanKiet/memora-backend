import type {
  FingerprintArtwork,
  ListFingerprintFramesResponse,
} from '@app/contracts';
import type {
  FingerprintArtworkResponseDto,
  FingerprintFramesResponseDto,
} from '../dto/fingerprint-artwork.dto';

/** Explicit public mapping. The preview URLs are short-lived credentials. */
export function toFingerprintArtworkResponse(
  response: FingerprintArtwork,
): FingerprintArtworkResponseDto {
  return {
    status: response.status,
    failureCode: response.failureCode ?? null,
    baseImageUrl: response.baseImageUrl ?? null,
    currentVersionId: response.currentVersionId ?? null,
    acceptedVersionId: response.acceptedVersionId ?? null,
    versions: (response.versions ?? []).map((version) => ({
      versionId: version.versionId,
      shape: version.shape,
      offsetX: version.offsetX,
      offsetY: version.offsetY,
      zoom: version.zoom,
      erasedRatio: version.erasedRatio,
      minEngraveSizeMm: version.minEngraveSizeMm,
      coverage: version.coverage,
      createdAt: version.createdAt,
      previewSvgUrl: version.previewSvgUrl ?? null,
      previewPngUrl: version.previewPngUrl ?? null,
    })),
  };
}

export function toFingerprintFramesResponse(
  response: ListFingerprintFramesResponse,
): FingerprintFramesResponseDto {
  return {
    defaultShape: response.defaultShape,
    shapes: (response.shapes ?? []).map((shape) => ({
      code: shape.code,
      name: shape.name,
      description: shape.description,
      sampleSvg: shape.sampleSvg,
    })),
  };
}
