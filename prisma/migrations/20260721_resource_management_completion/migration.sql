BEGIN;

ALTER TABLE "Resource"
ADD COLUMN "classId" TEXT,
ADD COLUMN "subjectId" TEXT,
ADD COLUMN "seriesId" TEXT,
ADD COLUMN "bookId" TEXT,
ADD COLUMN "originalFileName" TEXT,
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "fileSizeBytes" BIGINT;

CREATE INDEX "Resource_publisherId_classId_idx"
ON "Resource"("publisherId", "classId");

CREATE INDEX "Resource_publisherId_subjectId_idx"
ON "Resource"("publisherId", "subjectId");

CREATE INDEX "Resource_publisherId_seriesId_idx"
ON "Resource"("publisherId", "seriesId");

CREATE INDEX "Resource_publisherId_bookId_idx"
ON "Resource"("publisherId", "bookId");

ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_seriesId_fkey"
FOREIGN KEY ("seriesId") REFERENCES "BookSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

LOCK TABLE "Bookmark" IN ACCESS EXCLUSIVE MODE;

WITH duplicate_bookmarks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "teacherId", "resourceId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS row_num
  FROM "Bookmark"
)
DELETE FROM "Bookmark" b
USING duplicate_bookmarks d
WHERE b.id = d.id
  AND d.row_num > 1;

DO $$
DECLARE
  bookmark_oid regclass := '"Bookmark"'::regclass;
  teacher_attnum smallint;
  resource_attnum smallint;
  existing_constraint pg_constraint%ROWTYPE;
  existing_relation pg_class%ROWTYPE;
BEGIN
  SELECT attnum::smallint
  INTO STRICT teacher_attnum
  FROM pg_attribute
  WHERE attrelid = bookmark_oid
    AND attname = 'teacherId'
    AND attnum > 0
    AND NOT attisdropped;

  SELECT attnum::smallint
  INTO STRICT resource_attnum
  FROM pg_attribute
  WHERE attrelid = bookmark_oid
    AND attname = 'resourceId'
    AND attnum > 0
    AND NOT attisdropped;

  SELECT constraint_row.*
  INTO existing_constraint
  FROM pg_constraint AS constraint_row
  WHERE constraint_row.conrelid = bookmark_oid
    AND constraint_row.conname = 'Bookmark_teacherId_resourceId_key';

  IF FOUND THEN
    IF existing_constraint.contype = 'u'
       AND existing_constraint.convalidated
       AND NOT existing_constraint.condeferrable
       AND NOT existing_constraint.condeferred
       AND existing_constraint.conkey =
           ARRAY[teacher_attnum, resource_attnum]::smallint[]
       AND EXISTS (
         SELECT 1
         FROM pg_index AS constraint_index
         WHERE constraint_index.indexrelid = existing_constraint.conindid
           AND constraint_index.indrelid = bookmark_oid
           AND constraint_index.indisunique
           AND constraint_index.indisvalid
           AND constraint_index.indisready
           AND constraint_index.indnkeyatts = 2
           AND constraint_index.indnatts = 2
           AND constraint_index.indpred IS NULL
           AND constraint_index.indexprs IS NULL
           AND (
             SELECT array_agg(index_key.attnum::smallint ORDER BY index_key.ordinality)
             FROM unnest(constraint_index.indkey)
               WITH ORDINALITY AS index_key(attnum, ordinality)
           ) = ARRAY[teacher_attnum, resource_attnum]::smallint[]
       )
    THEN
      RETURN;
    END IF;

    RAISE EXCEPTION
      'Constraint Bookmark_teacherId_resourceId_key exists but is not the expected UNIQUE ("teacherId", "resourceId") constraint';
  END IF;

  SELECT relation_row.*
  INTO existing_relation
  FROM pg_class AS relation_row
  WHERE relation_row.relnamespace = (
      SELECT bookmark_row.relnamespace
      FROM pg_class AS bookmark_row
      WHERE bookmark_row.oid = bookmark_oid
    )
    AND relation_row.relname = 'Bookmark_teacherId_resourceId_key';

  IF FOUND THEN
    IF existing_relation.relkind <> 'i'
       OR NOT EXISTS (
         SELECT 1
         FROM pg_index AS standalone_index
         JOIN pg_class AS index_row
           ON index_row.oid = standalone_index.indexrelid
         JOIN pg_am AS access_method
           ON access_method.oid = index_row.relam
         WHERE standalone_index.indexrelid = existing_relation.oid
           AND standalone_index.indrelid = bookmark_oid
           AND standalone_index.indisunique
           AND standalone_index.indisvalid
           AND standalone_index.indisready
           AND standalone_index.indislive
           AND standalone_index.indimmediate
           AND standalone_index.indnkeyatts = 2
           AND standalone_index.indnatts = 2
           AND standalone_index.indpred IS NULL
           AND standalone_index.indexprs IS NULL
           AND access_method.amname = 'btree'
           AND NOT EXISTS (
             SELECT 1
             FROM pg_constraint AS owner_constraint
             WHERE owner_constraint.conindid = standalone_index.indexrelid
           )
           AND (
             SELECT array_agg(index_key.attnum::smallint ORDER BY index_key.ordinality)
             FROM unnest(standalone_index.indkey)
               WITH ORDINALITY AS index_key(attnum, ordinality)
           ) = ARRAY[teacher_attnum, resource_attnum]::smallint[]
       )
    THEN
      RAISE EXCEPTION
        'Object Bookmark_teacherId_resourceId_key exists but is not an eligible standalone UNIQUE btree index on Bookmark ("teacherId", "resourceId")';
    END IF;

    EXECUTE
      'ALTER TABLE "Bookmark" '
      'ADD CONSTRAINT "Bookmark_teacherId_resourceId_key" '
      'UNIQUE USING INDEX "Bookmark_teacherId_resourceId_key"';
  ELSE
    EXECUTE
      'ALTER TABLE "Bookmark" '
      'ADD CONSTRAINT "Bookmark_teacherId_resourceId_key" '
      'UNIQUE ("teacherId", "resourceId")';
  END IF;
END
$$;

COMMIT;
