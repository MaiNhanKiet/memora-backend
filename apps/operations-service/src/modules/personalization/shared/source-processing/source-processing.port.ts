/**
 * PERSO-013 producer port. A source that just became ACCEPTED (PERSO-008, PERSO-010) is
 * handed over here AFTER its transaction commits. Bound to BullMQ (job id = `${sourceId}-r${revision}`, revision 0 for the first run;
 * PERSO-035 bumps it so a re-segmentation is not deduplicated).
 */
export interface SourceProcessingTrigger {
  /** Must not throw for a transient failure the caller cannot act on; callers still guard it. */
  enqueue(sourceId: string, revision?: number): Promise<void>;
}

export const SOURCE_PROCESSING_TRIGGER = Symbol('SOURCE_PROCESSING_TRIGGER');
