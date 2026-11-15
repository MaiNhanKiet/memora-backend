-- capture_attempt_pending_review (D-P-11 amended, docs/plans/active/operations-personalization.md,
-- "Revision 2026-11-15: the capture staff decides").
-- The quality threshold is only a suggestion: every stored image is PENDING_REVIEW until the staff
-- accepts or rejects it, and a staff-accepted image may score below the snapshot threshold.
--
-- Rollback (manual, forward recovery): first resolve every PENDING_REVIEW row
-- (UPDATE ... SET result='REJECTED', failure_reason='STAFF_REJECTED') and make sure every ACCEPTED row
-- has quality_threshold_snapshot IS NOT NULL AND quality_score >= quality_threshold_snapshot, then
-- re-add the two constraints below with the 0_baseline definitions (result IN ('ACCEPTED','REJECTED','ERROR')
-- and the ACCEPTED rule with quality_score >= quality_threshold_snapshot).
-- Prisma applies this file as one multi-statement script (implicit transaction); the partial unique
-- index "one ACCEPTED attempt per session" is not touched.

ALTER TABLE personalization.capture_attempts
  DROP CONSTRAINT personalization_capture_attempts_c6dc848f_ck,
  DROP CONSTRAINT personalization_capture_attempts_14e4bca0_ck;

ALTER TABLE personalization.capture_attempts
  ADD CONSTRAINT personalization_capture_attempts_c6dc848f_ck
    CHECK (result IN ('PENDING_REVIEW','ACCEPTED','REJECTED','ERROR')),
  ADD CONSTRAINT personalization_capture_attempts_14e4bca0_ck
    CHECK (
      (result='ACCEPTED' AND quality_score IS NOT NULL AND failure_reason IS NULL)
      OR (result='PENDING_REVIEW' AND failure_reason IS NULL)
      OR (result IN ('REJECTED','ERROR') AND failure_reason IS NOT NULL)
    );
