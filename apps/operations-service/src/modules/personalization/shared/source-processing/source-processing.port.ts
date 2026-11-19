/**
 * Seam for PERSO-013 (internal processing job). A source that just became ACCEPTED
 * (PERSO-010 now, PERSO-008 later) is handed over here AFTER its transaction commits.
 * PERSO-013 replaces the logging binding with the BullMQ producer (job id = source id).
 */
export interface SourceProcessingTrigger {
  /** Must not throw for a transient failure the caller cannot act on; callers still guard it. */
  enqueue(sourceId: string): Promise<void>;
}

export const SOURCE_PROCESSING_TRIGGER = Symbol('SOURCE_PROCESSING_TRIGGER');
