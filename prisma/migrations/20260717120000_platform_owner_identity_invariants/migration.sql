-- Stage 1 authorization hardening.
-- Run scripts/preflight-super-admin-invariants.sql and resolve any non-zero
-- counts through an explicitly approved manual process before applying.
-- This constraint is intentionally additive and performs no data repair.
ALTER TABLE "User"
ADD CONSTRAINT "User_role_publisher_invariant_check"
CHECK (
  ("role" <> 'SUPER_ADMIN' OR "publisherId" IS NULL)
  AND
  ("role" <> 'ADMIN' OR "publisherId" IS NOT NULL)
);
