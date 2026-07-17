-- Stage 3 append-only security audit ledger.
-- Historical actor and publisher identifiers are intentionally scalar snapshots:
-- no foreign key can cascade-delete or rewrite security history.
CREATE TYPE "SecurityAuditOutcome" AS ENUM ('SUCCESS', 'DENIED', 'FAILURE');

CREATE TABLE "SecurityAuditEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorRole" "UserRole",
    "publisherId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "outcome" "SecurityAuditOutcome" NOT NULL,
    "reasonCode" TEXT,
    "correlationId" TEXT NOT NULL,
    "metadata" JSONB,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SecurityAuditEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SecurityAuditEvent_action_length_check" CHECK (char_length("action") BETWEEN 3 AND 120),
    CONSTRAINT "SecurityAuditEvent_target_type_length_check" CHECK (char_length("targetType") BETWEEN 1 AND 80),
    CONSTRAINT "SecurityAuditEvent_target_id_length_check" CHECK ("targetId" IS NULL OR char_length("targetId") <= 191),
    CONSTRAINT "SecurityAuditEvent_reason_code_check" CHECK ("reasonCode" IS NULL OR "reasonCode" ~ '^[A-Z0-9_]{3,80}$'),
    CONSTRAINT "SecurityAuditEvent_schema_version_check" CHECK ("schemaVersion" = 1),
    CONSTRAINT "SecurityAuditEvent_metadata_object_check" CHECK ("metadata" IS NULL OR jsonb_typeof("metadata") = 'object')
);

CREATE INDEX "SecurityAuditEvent_createdAt_idx" ON "SecurityAuditEvent"("createdAt");
CREATE INDEX "SecurityAuditEvent_action_createdAt_idx" ON "SecurityAuditEvent"("action", "createdAt");
CREATE INDEX "SecurityAuditEvent_publisherId_createdAt_idx" ON "SecurityAuditEvent"("publisherId", "createdAt");
CREATE INDEX "SecurityAuditEvent_actorUserId_createdAt_idx" ON "SecurityAuditEvent"("actorUserId", "createdAt");
CREATE INDEX "SecurityAuditEvent_correlationId_idx" ON "SecurityAuditEvent"("correlationId");

CREATE FUNCTION "reject_security_audit_event_mutation_20260717180000"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'SecurityAuditEvent is append-only'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "SecurityAuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "SecurityAuditEvent"
FOR EACH ROW
EXECUTE FUNCTION "reject_security_audit_event_mutation_20260717180000"();
