import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import {
  SOUNDWAVE_SEGMENT_MS,
  SOUNDWAVE_WAVECODE_STYLES,
  SOURCE_STATUSES,
} from '@app/contracts';

export class SelectWavecodeStyleRequestDto {
  @ApiProperty({ enum: SOUNDWAVE_WAVECODE_STYLES })
  @IsIn(SOUNDWAVE_WAVECODE_STYLES)
  style!: string;
}

export class AcceptWavecodeStyleRequestDto {
  @ApiPropertyOptional({
    enum: SOUNDWAVE_WAVECODE_STYLES,
    description: 'Defaults to the current style.',
  })
  @IsOptional()
  @IsIn(SOUNDWAVE_WAVECODE_STYLES)
  style?: string;
}

export class ResegmentSoundwaveRequestDto {
  @ApiProperty({
    description: `Start of the new ${SOUNDWAVE_SEGMENT_MS} ms segment; segmentStartMs + ${SOUNDWAVE_SEGMENT_MS} must not exceed the audio duration (else 400 SEGMENT_OUT_OF_RANGE)`,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  segmentStartMs!: number;

  @ApiPropertyOptional({
    enum: SOUNDWAVE_WAVECODE_STYLES,
    description: 'Defaults to the current style.',
  })
  @IsOptional()
  @IsIn(SOUNDWAVE_WAVECODE_STYLES)
  wavecodeStyle?: string;
}

export class WavecodeStyleResponseDto {
  @ApiProperty({ enum: SOUNDWAVE_WAVECODE_STYLES })
  code!: string;

  @ApiProperty({ example: 'Classic' })
  name!: string;

  @ApiProperty({ description: 'True when this style has files.' })
  generated!: boolean;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'Presigned SVG preview, valid for 300 s. Null unless generated.',
  })
  previewSvgUrl!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'Presigned PNG preview, valid for 300 s. Null unless generated.',
  })
  previewPngUrl!: string | null;
}

export class WavecodeResponseDto {
  @ApiProperty({ enum: SOURCE_STATUSES })
  status!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Set only when processing failed.',
  })
  failureCode!: string | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    description:
      'Audio duration in ms: measured by the worker when known, else the one declared at upload.',
  })
  durationMs!: number | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'Start of the selected segment; null until it is chosen.',
  })
  segmentStartMs!: number | null;

  @ApiProperty({ example: SOUNDWAVE_SEGMENT_MS })
  segmentDurationMs!: number;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'Presigned URL of the uploaded audio, valid for 300 s. Null while PENDING or without an object.',
  })
  rawAudioUrl!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'Presigned URL of the processed 3 s segment (WAV), valid for 300 s. Null unless READY.',
  })
  segmentAudioUrl!: string | null;

  @ApiProperty({ enum: SOUNDWAVE_WAVECODE_STYLES })
  currentStyle!: string;

  @ApiProperty({
    enum: SOUNDWAVE_WAVECODE_STYLES,
    nullable: true,
    type: String,
    description: 'Null until the customer accepts a style (PERSO-034).',
  })
  acceptedStyle!: string | null;

  @ApiProperty({ type: [WavecodeStyleResponseDto] })
  styles!: WavecodeStyleResponseDto[];
}
