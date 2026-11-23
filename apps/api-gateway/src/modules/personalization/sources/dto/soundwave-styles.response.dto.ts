import { ApiProperty } from '@nestjs/swagger';
import { SOUNDWAVE_WAVECODE_STYLES } from '@app/contracts';

export class SoundwaveStyleResponseDto {
  @ApiProperty({ enum: SOUNDWAVE_WAVECODE_STYLES })
  code!: string;

  @ApiProperty({ example: 'Classic' })
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({
    enum: ['BAR_HEIGHT', 'PEAK_HEIGHT'],
    description: 'How the WAVECODE is read back from the engraving.',
  })
  decoder!: string;

  @ApiProperty({
    description: 'Small preview image as an SVG document (from the worker).',
  })
  sampleSvg!: string;
}

export class SoundwaveStylesResponseDto {
  @ApiProperty({ enum: SOUNDWAVE_WAVECODE_STYLES, example: 'CLASSIC' })
  defaultStyle!: string;

  @ApiProperty({ type: [SoundwaveStyleResponseDto] })
  styles!: SoundwaveStyleResponseDto[];
}
