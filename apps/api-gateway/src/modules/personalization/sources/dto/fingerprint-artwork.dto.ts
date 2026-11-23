import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import {
  ARTWORK_MAX_POINTS,
  ARTWORK_MAX_STROKES,
  ARTWORK_OFFSET_MAX,
  ARTWORK_OFFSET_MIN,
  ARTWORK_STROKE_RADIUS_MAX,
  ARTWORK_STROKE_RADIUS_MIN,
  ARTWORK_ZOOM_MAX,
  ARTWORK_ZOOM_MIN,
  FINGERPRINT_SHAPES,
  SOURCE_STATUSES,
} from '@app/contracts';

/** Every point is an [x, y] pair of numbers in 0..1. */
@ValidatorConstraint({ name: 'unitPointPairs', async: false })
class UnitPointPairsConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return (
      Array.isArray(value) &&
      value.every(
        (point: unknown) =>
          Array.isArray(point) &&
          point.length === 2 &&
          point.every(
            (v: unknown) =>
              typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1,
          ),
      )
    );
  }

  defaultMessage(): string {
    return 'each point must be [x, y] with x and y between 0 and 1';
  }
}

export class EraseStrokeDto {
  @ApiProperty({
    minimum: ARTWORK_STROKE_RADIUS_MIN,
    maximum: ARTWORK_STROKE_RADIUS_MAX,
    description: 'Brush radius, relative to the frame size',
  })
  @IsNumber()
  @Min(ARTWORK_STROKE_RADIUS_MIN)
  @Max(ARTWORK_STROKE_RADIUS_MAX)
  radius!: number;

  @ApiProperty({
    type: 'array',
    items: { type: 'array', items: { type: 'number' } },
    minItems: 1,
    maxItems: ARTWORK_MAX_POINTS,
    example: [
      [0.4, 0.5],
      [0.42, 0.52],
    ],
    description: '[x, y] pairs in 0..1',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ARTWORK_MAX_POINTS)
  @Validate(UnitPointPairsConstraint)
  points!: number[][];
}

export class CreateFingerprintCropRequestDto {
  @ApiProperty({ enum: FINGERPRINT_SHAPES })
  @IsIn(FINGERPRINT_SHAPES)
  shape!: string;

  @ApiProperty({ minimum: ARTWORK_OFFSET_MIN, maximum: ARTWORK_OFFSET_MAX })
  @IsNumber()
  @Min(ARTWORK_OFFSET_MIN)
  @Max(ARTWORK_OFFSET_MAX)
  offsetX!: number;

  @ApiProperty({ minimum: ARTWORK_OFFSET_MIN, maximum: ARTWORK_OFFSET_MAX })
  @IsNumber()
  @Min(ARTWORK_OFFSET_MIN)
  @Max(ARTWORK_OFFSET_MAX)
  offsetY!: number;

  @ApiProperty({ minimum: ARTWORK_ZOOM_MIN, maximum: ARTWORK_ZOOM_MAX })
  @IsNumber()
  @Min(ARTWORK_ZOOM_MIN)
  @Max(ARTWORK_ZOOM_MAX)
  zoom!: number;

  @ApiPropertyOptional({
    type: [EraseStrokeDto],
    maxItems: ARTWORK_MAX_STROKES,
    description:
      'Eraser strokes. They only remove ink (at most 15 % of the ridge area, else 422 ERASE_AREA_TOO_LARGE).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ARTWORK_MAX_STROKES)
  @ValidateNested({ each: true })
  @Type(() => EraseStrokeDto)
  eraseStrokes?: EraseStrokeDto[];
}

export class AcceptFingerprintArtworkRequestDto {
  @ApiProperty({ example: 'v1', description: 'A versionId of PERSO-037' })
  @IsString()
  @Matches(/^v\d{1,4}$/)
  versionId!: string;
}

export class FingerprintArtworkVersionResponseDto {
  @ApiProperty({ example: 'v0' })
  versionId!: string;

  @ApiProperty({ enum: FINGERPRINT_SHAPES })
  shape!: string;

  @ApiProperty()
  offsetX!: number;

  @ApiProperty()
  offsetY!: number;

  @ApiProperty()
  zoom!: number;

  @ApiProperty({ description: 'Share of the ridge area the eraser removed.' })
  erasedRatio!: number;

  @ApiProperty({
    description:
      'Smallest engraving size in mm that keeps the ridges at 0.07 mm or more.',
  })
  minEngraveSizeMm!: number;

  @ApiProperty({ description: 'Share of the frame covered by ridges, 0..1.' })
  coverage!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Presigned SVG preview, valid for 300 s.',
  })
  previewSvgUrl!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Presigned PNG preview, valid for 300 s.',
  })
  previewPngUrl!: string | null;
}

export class FingerprintArtworkResponseDto {
  @ApiProperty({ enum: SOURCE_STATUSES })
  status!: string;

  @ApiProperty({ nullable: true, type: String })
  failureCode!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'Presigned URL of the cleaned base image, valid for 300 s. Null once a version is accepted or without an editable artwork.',
  })
  baseImageUrl!: string | null;

  @ApiProperty({ nullable: true, type: String })
  currentVersionId!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Null until the customer accepts a version (PERSO-039).',
  })
  acceptedVersionId!: string | null;

  @ApiProperty({ type: [FingerprintArtworkVersionResponseDto] })
  versions!: FingerprintArtworkVersionResponseDto[];
}

export class FingerprintFrameResponseDto {
  @ApiProperty({ enum: FINGERPRINT_SHAPES })
  code!: string;

  @ApiProperty({ example: 'Natural' })
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ description: 'Small preview image as an SVG document.' })
  sampleSvg!: string;
}

export class FingerprintFramesResponseDto {
  @ApiProperty({ enum: FINGERPRINT_SHAPES, example: 'NATURAL' })
  defaultShape!: string;

  @ApiProperty({ type: [FingerprintFrameResponseDto] })
  shapes!: FingerprintFrameResponseDto[];
}
