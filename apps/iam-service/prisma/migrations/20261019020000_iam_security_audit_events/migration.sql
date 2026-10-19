-- Append-only security audit for account linking changes.
-- Rollback: DROP TABLE "iam"."security_audit_events";

CREATE TABLE "iam"."security_audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "outcome" VARCHAR(20) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "security_audit_events_user_id_created_at_idx"
    ON "iam"."security_audit_events"("user_id", "created_at");

ALTER TABLE "iam"."security_audit_events"
    ADD CONSTRAINT "security_audit_events_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;
