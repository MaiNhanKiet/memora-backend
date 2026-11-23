import type { ArtworkState } from '../../shared/source-processing/application/artwork-state';

/** A fingerprint source as the artwork use cases see it. Never leaves the application layer. */
export interface ArtworkSourceRecord {
  readonly sourceId: string;
  readonly sourceType: string;
  readonly status: string;
  /** From the linked consent, else the active bindings, else the capture session. */
  readonly orderId: string | undefined;
  readonly sessionId: string | undefined;
  readonly attemptNo: number | undefined;
  readonly ringItemIds: readonly string[];
  readonly failureCode: string | undefined;
  /** Undefined when the metadata has no artwork object. */
  readonly artwork: ArtworkState | undefined;
}

export interface ArtworkRepository {
  /** Undefined when the source is missing, DELETED or owned by someone else. */
  find(
    sourceId: string,
    ownerCustomerIdentityId: string,
  ): Promise<ArtworkSourceRecord | undefined>;

  /**
   * One transaction under the advisory lock `artwork:{sourceId}`. `decide` gets the fresh
   * record (it may call the worker, so the transaction can stay open for a while) and returns
   * the new artwork state, or undefined for "no change". The write is conditional on READY and
   * moves `vector_asset_key` / `vector_checksum` to the current version's SVG. Anything
   * `decide` throws rolls back. Undefined when the source is missing, DELETED or owned by
   * someone else.
   */
  updateLocked(
    sourceId: string,
    ownerCustomerIdentityId: string,
    decide: (record: ArtworkSourceRecord) => Promise<ArtworkState | undefined>,
  ): Promise<ArtworkSourceRecord | undefined>;
}

export const ARTWORK_REPOSITORY = Symbol('ARTWORK_REPOSITORY');
