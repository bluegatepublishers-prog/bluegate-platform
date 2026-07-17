-- Read-only, count-only preflight for the platform-owner identity migration.
-- Expected result: every count is zero.
SELECT
  COUNT(*) FILTER (
    WHERE "role" = 'SUPER_ADMIN' AND "publisherId" IS NOT NULL
  ) AS "super_admin_with_publisher_count",
  COUNT(*) FILTER (
    WHERE "role" = 'ADMIN' AND "publisherId" IS NULL
  ) AS "admin_without_publisher_count"
FROM "User";

SELECT COUNT(*) AS "super_admin_with_tenant_profile_count"
FROM "User" AS u
WHERE u."role" = 'SUPER_ADMIN'
  AND (
    EXISTS (SELECT 1 FROM "School" s WHERE s."userId" = u."id")
    OR EXISTS (SELECT 1 FROM "Teacher" t WHERE t."userId" = u."id")
    OR EXISTS (SELECT 1 FROM "Student" st WHERE st."userId" = u."id")
    OR EXISTS (SELECT 1 FROM "Mentor" m WHERE m."userId" = u."id")
    OR EXISTS (SELECT 1 FROM "Parent" p WHERE p."userId" = u."id")
  );
