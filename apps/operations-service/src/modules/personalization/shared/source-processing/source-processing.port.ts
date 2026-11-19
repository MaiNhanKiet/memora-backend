/**
 * PERSO-013 producer port. A source that just became ACCEPTED (PERSO-008, PERSO-010) is
 * handed over here AFTER its transaction commits. Bound to BullMQ (job id = source id).
 */
export interface SourceProcessingTrigger {
  /** Must not throw for a transient failure the caller cannot act on; callers still guard it. */
  enqueue(sourceId: string): Promise<void>;
}

export const SOURCE_PROCESSING_TRIGGER = Symbol('SOURCE_PROCESSING_TRIGGER');
