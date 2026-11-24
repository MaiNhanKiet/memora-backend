import type { WavecodeState } from '../../shared/source-processing/application/wavecode-state';

/** A source as the wavecode use cases see it. Never leaves the application layer. */
export interface WavecodeSourceRecord {
  readonly sourceId: string;
  readonly sourceType: string;
  readonly status: string;
  /** From the linked consent, else the active bindings. */
  readonly orderId: string | undefined;
  readonly ringItemIds: readonly string[];
  readonly rawAssetKey: string | undefined;
  /** Content type declared at upload (metadata). */
  readonly contentType: string | undefined;
  readonly failureCode: string | undefined;
  /** FE-declared duration (metadata.durationMs). */
  readonly declaredDurationMs: number | undefined;
  /** Worker-measured duration (metadata.measuredDurationMs). */
  readonly measuredDurationMs: number | undefined;
  readonly segmentStartMs: number | undefined;
  readonly audioSegmentKey: string | undefined;
  /** Style picked at PERSO-010 / PERSO-035 (metadata.wavecodeStyle). */
  readonly wavecodeStyle: string | undefined;
  /** Bumped by every re-segmentation; 0 for the first processing run. */
  readonly revision: number;
  readonly resegmentCount: number;
  /** Undefined when the metadata has no usable wavecode. */
  readonly wavecode: WavecodeState | undefined;
}

export interface ResegmentPlan {
  readonly segmentStartMs: number;
  readonly wavecodeStyle: string;
}

export interface ResegmentOutcome {
  /** The record as it was before the reset (its output keys are deleted afterwards). */
  readonly before: WavecodeSourceRecord;
  readonly after: WavecodeSourceRecord;
}

export interface WavecodeRepository {
  /** Undefined when the source is missing, DELETED or owned by someone else. */
  find(
    sourceId: string,
    ownerCustomerIdentityId: string,
  ): Promise<WavecodeSourceRecord | undefined>;

  /**
   * One transaction under the advisory lock `wavecode-style:{sourceId}`. `decide` gets the
   * fresh record (it may call the worker, so the transaction can stay open for a while) and
   * returns the new wavecode state, or undefined for "no change". The write is conditional on
   * READY and moves `vector_asset_key` / `vector_checksum` to the current style's SVG.
   * Anything `decide` throws rolls back. Undefined when the source is missing, DELETED or
   * owned by someone else.
   */
  updateLocked(
    sourceId: string,
    ownerCustomerIdentityId: string,
    decide: (
      record: WavecodeSourceRecord,
    ) => Promise<WavecodeState | undefined>,
  ): Promise<WavecodeSourceRecord | undefined>;

  /**
   * PERSO-035. One transaction under the same advisory lock. `plan` checks the fresh record
   * and returns the new segment and style (it throws to refuse). The write is conditional on
   * the status that was read: status becomes ACCEPTED, `wavecode`, `failureCode`, processing
   * timestamps and `audioSegmentKey` are removed, `revision` and `resegmentCount` grow by one,
   * and `vector_asset_key`, `vector_checksum` and `processed_asset_key` become NULL.
   * Undefined when the source is missing, DELETED or owned by someone else.
   */
  resegment(
    sourceId: string,
    ownerCustomerIdentityId: string,
    plan: (record: WavecodeSourceRecord) => ResegmentPlan,
  ): Promise<ResegmentOutcome | undefined>;
}

export const WAVECODE_REPOSITORY = Symbol('WAVECODE_REPOSITORY');
