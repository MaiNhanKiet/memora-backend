import {
  SOUNDWAVE_DEFAULT_WAVECODE_STYLE,
  SOUNDWAVE_WAVECODE_STYLES,
} from '@app/contracts';
import type { JsonValue } from './source-processing.repository';

/** Files of one generated style (server side only: never returned to a client). */
export interface WavecodeStyleEntry {
  readonly svgKey: string;
  readonly svgSha256: string;
  readonly svgSize: number;
  readonly pngKey: string;
  readonly pngSha256: string;
  readonly pngSize: number;
}

/**
 * `personalization_sources.metadata_json.wavecode` of a READY SOUNDWAVE source.
 * `style` is the current one; `acceptedStyle` is final (PERSO-034) and locks the choice.
 */
export interface WavecodeState {
  readonly scheme: string;
  readonly levels: readonly number[];
  readonly checkBars: readonly number[];
  readonly style: string;
  readonly styles: Readonly<Record<string, WavecodeStyleEntry>>;
  readonly acceptedStyle?: string;
  readonly acceptedAt?: string;
}

export const WAVECODE_STYLE_NAMES: Readonly<Record<string, string>> = {
  CLASSIC: 'Classic',
  HAIRLINE: 'Hairline',
  OSCILLOSCOPE: 'Oscilloscope',
};

export function knownStyle(value: unknown): string | undefined {
  return SOUNDWAVE_WAVECODE_STYLES.find((style) => style === value);
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function numbers(value: unknown): number[] | undefined {
  return Array.isArray(value) && value.every((v) => typeof v === 'number')
    ? value
    : undefined;
}

function entry(value: unknown): WavecodeStyleEntry | undefined {
  const item = record(value);
  if (
    item === undefined ||
    typeof item.svgKey !== 'string' ||
    typeof item.svgSha256 !== 'string' ||
    typeof item.svgSize !== 'number' ||
    typeof item.pngKey !== 'string' ||
    typeof item.pngSha256 !== 'string' ||
    typeof item.pngSize !== 'number'
  ) {
    return undefined;
  }
  return {
    svgKey: item.svgKey,
    svgSha256: item.svgSha256,
    svgSize: item.svgSize,
    pngKey: item.pngKey,
    pngSha256: item.pngSha256,
    pngSize: item.pngSize,
  };
}

/** Undefined when the source has no usable wavecode (levels are required). */
export function readWavecodeState(
  metadata: Readonly<Record<string, unknown>>,
): WavecodeState | undefined {
  const wavecode = record(metadata.wavecode);
  const levels = numbers(wavecode?.levels);
  if (wavecode === undefined || levels === undefined) {
    return undefined;
  }
  const styles: Record<string, WavecodeStyleEntry> = {};
  const rawStyles = record(wavecode.styles);
  for (const code of SOUNDWAVE_WAVECODE_STYLES) {
    const parsed = entry(rawStyles?.[code]);
    if (parsed !== undefined) {
      styles[code] = parsed;
    }
  }
  const acceptedStyle = knownStyle(wavecode.acceptedStyle);
  return {
    scheme: typeof wavecode.scheme === 'string' ? wavecode.scheme : '',
    levels,
    checkBars: numbers(wavecode.checkBars) ?? [],
    style:
      knownStyle(wavecode.style) ??
      knownStyle(metadata.wavecodeStyle) ??
      SOUNDWAVE_DEFAULT_WAVECODE_STYLE,
    styles,
    ...(acceptedStyle === undefined ? {} : { acceptedStyle }),
    ...(typeof wavecode.acceptedAt === 'string'
      ? { acceptedAt: wavecode.acceptedAt }
      : {}),
  };
}

export function writeWavecodeState(
  state: WavecodeState,
): Record<string, JsonValue> {
  const styles: Record<string, JsonValue> = {};
  for (const [code, item] of Object.entries(state.styles)) {
    styles[code] = { ...item };
  }
  return {
    scheme: state.scheme,
    levels: [...state.levels],
    checkBars: [...state.checkBars],
    style: state.style,
    styles,
    ...(state.acceptedStyle === undefined
      ? {}
      : { acceptedStyle: state.acceptedStyle }),
    ...(state.acceptedAt === undefined ? {} : { acceptedAt: state.acceptedAt }),
  };
}
