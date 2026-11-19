/**
 * A personalization source as the application layer sees it. It never carries
 * object keys, checksums or metadata (NFR-S-01).
 */
export interface OrderSourceRecord {
  readonly sourceId: string;
  readonly sourceType: string;
  readonly status: string;
  /** From `metadata_json.failureCode` when the processing job wrote one. */
  readonly failureCode: string | undefined;
  readonly acceptedAt: Date | null;
  /** Ring Items of this order with an active binding to the source. */
  readonly ringItemIds: readonly string[];
  /** Undefined while the source has no active binding in this order. */
  readonly bindingMode: string | undefined;
}

/** Processing state of one source, read from `status` and `metadata_json` (no keys). */
export interface SourceProcessingRecord {
  readonly sourceId: string;
  readonly sourceType: string;
  readonly status: string;
  readonly failureCode: string | undefined;
  readonly startedAt: Date | undefined;
  readonly finishedAt: Date | undefined;
}

export interface OrderSourcesRepository {
  /** Sources linked to the order through consents or active bindings. DELETED is excluded. */
  listForOrder(
    orderId: string,
    ownerCustomerIdentityId: string,
  ): Promise<OrderSourceRecord[]>;

  /** Undefined when the source is missing, DELETED or owned by someone else. */
  findProcessing(
    sourceId: string,
    ownerCustomerIdentityId: string,
  ): Promise<SourceProcessingRecord | undefined>;
}

export const ORDER_SOURCES_REPOSITORY = Symbol('ORDER_SOURCES_REPOSITORY');
