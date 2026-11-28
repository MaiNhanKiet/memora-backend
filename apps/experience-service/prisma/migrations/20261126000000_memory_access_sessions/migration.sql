ALTER TABLE "memory"."access_grants" ADD COLUMN "session_token_hash" VARCHAR(64);

CREATE UNIQUE INDEX "memory_access_grants_session_token_hash_uq"
  ON "memory"."access_grants" ("session_token_hash");
