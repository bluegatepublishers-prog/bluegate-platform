-- CreateEnum
CREATE TYPE "TeacherQuestionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "TeacherQuestion" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "sectionSubjectId" TEXT,
    "bookId" TEXT,
    "chapterId" TEXT,
    "moduleId" TEXT,
    "imageResourceId" TEXT,
    "questionType" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT,
    "explanation" TEXT,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "bloomLevel" TEXT,
    "competency" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "TeacherQuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "sourceHash" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherQuestion_publisherId_schoolId_teacherId_status_idx" ON "TeacherQuestion"("publisherId", "schoolId", "teacherId", "status");

-- CreateIndex
CREATE INDEX "TeacherQuestion_schoolId_sectionSubjectId_status_idx" ON "TeacherQuestion"("schoolId", "sectionSubjectId", "status");

-- CreateIndex
CREATE INDEX "TeacherQuestion_bookId_chapterId_moduleId_idx" ON "TeacherQuestion"("bookId", "chapterId", "moduleId");

-- CreateIndex
CREATE INDEX "TeacherQuestion_questionType_difficulty_status_idx" ON "TeacherQuestion"("questionType", "difficulty", "status");

-- AddForeignKey
ALTER TABLE "TeacherQuestion" ADD CONSTRAINT "TeacherQuestion_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherQuestion" ADD CONSTRAINT "TeacherQuestion_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherQuestion" ADD CONSTRAINT "TeacherQuestion_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherQuestion" ADD CONSTRAINT "TeacherQuestion_sectionSubjectId_fkey" FOREIGN KEY ("sectionSubjectId") REFERENCES "SectionSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherQuestion" ADD CONSTRAINT "TeacherQuestion_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherQuestion" ADD CONSTRAINT "TeacherQuestion_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherQuestion" ADD CONSTRAINT "TeacherQuestion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BookModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherQuestion" ADD CONSTRAINT "TeacherQuestion_imageResourceId_fkey" FOREIGN KEY ("imageResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;