export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface ProcessableSource {
  readonly id: string;
  readonly sourceType: string;
  readonly status: string;
  readonly rawAssetKey: string | undefined;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SaveReadyInput {
  readonly sourceId: string;
  readonly manifestKey: string;
  readonly vectorKey: string;
  readonly vectorSha256: string;
  /** Merged over the existing `metadata_json` (existing fields are kept). */
  readonly metadata: Readonly<Record<string, JsonValue>>;
}

export interface SaveSoundwaveReadyInput extends SaveReadyInput {
  /** The WAVECODE levels that must be unique among non-DELETED SOUNDWAVE sources. */
  readonly levels: readonly number[];
}

export type SaveSoundwaveOutcome = 'SAVED' | 'COLLISION' | 'NOT_PROCESSING';

export interface SourceProcessingRepository {
  find(sourceId: string): Promise<ProcessableSource | undefined>;

  /** Conditional ACCEPTED -> PROCESSING; stores `processingStartedAt`. False when not ACCEPTED. */
  startProcessing(sourceId: string, now: Date): Promise<boolean>;

  /** One transaction, only while PROCESSING. False when the source is no longer PROCESSING. */
  saveReady(input: SaveReadyInput): Promise<boolean>;

  /**
   * Like saveReady for SOUNDWAVE, under the `wavecode` advisory lock: re-checks that no other
   * non-DELETED SOUNDWAVE source holds the same levels before saving.
   */
  saveSoundwaveReady(
    input: SaveSoundwaveReadyInput,
  ): Promise<SaveSoundwaveOutcome>;

  /** Which of the candidate level sequences another non-DELETED SOUNDWAVE source already uses. */
  findUsedLevels(
    sourceId: string,
    candidates: readonly (readonly number[])[],
  ): Promise<readonly (readonly number[])[]>;

  /** Conditional PROCESSING -> PROCESSING_FAILED with `metadata_json.failureCode`. */
  markFailed(
    sourceId: string,
    failureCode: string,
    now: Date,
  ): Promise<boolean>;
}

export const SOURCE_PROCESSING_REPOSITORY = Symbol(
  'SOURCE_PROCESSING_REPOSITORY',
);
