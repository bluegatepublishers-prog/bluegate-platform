-- CreateTable
CREATE TABLE "TeachingPlan" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "sectionSubjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingPeriod" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingPeriodPageRef" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "moduleId" TEXT,
    "pageSourceHash" TEXT,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingPeriodPageRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeachingPlan_schoolId_academicYearId_sectionSubjectId_teacherId_bookId_key" ON "TeachingPlan"("schoolId", "academicYearId", "sectionSubjectId", "teacherId", "bookId");

-- CreateIndex
CREATE INDEX "TeachingPlan_schoolId_academicYearId_idx" ON "TeachingPlan"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "TeachingPlan_sectionSubjectId_academicYearId_idx" ON "TeachingPlan"("sectionSubjectId", "academicYearId");

-- CreateIndex
CREATE INDEX "TeachingPlan_teacherId_academicYearId_idx" ON "TeachingPlan"("teacherId", "academicYearId");

-- CreateIndex
CREATE INDEX "TeachingPlan_bookId_idx" ON "TeachingPlan"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingPeriod_planId_sequence_key" ON "TeachingPeriod"("planId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingPeriodPageRef_periodId_pageId_key" ON "TeachingPeriodPageRef"("periodId", "pageId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingPeriodPageRef_periodId_sequence_key" ON "TeachingPeriodPageRef"("periodId", "sequence");

-- CreateIndex
CREATE INDEX "TeachingPeriodPageRef_pageId_idx" ON "TeachingPeriodPageRef"("pageId");

-- CreateIndex
CREATE INDEX "TeachingPeriodPageRef_moduleId_idx" ON "TeachingPeriodPageRef"("moduleId");

-- AddForeignKey
ALTER TABLE "TeachingPlan" ADD CONSTRAINT "TeachingPlan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingPlan" ADD CONSTRAINT "TeachingPlan_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingPlan" ADD CONSTRAINT "TeachingPlan_sectionSubjectId_fkey" FOREIGN KEY ("sectionSubjectId") REFERENCES "SectionSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingPlan" ADD CONSTRAINT "TeachingPlan_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingPlan" ADD CONSTRAINT "TeachingPlan_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingPeriod" ADD CONSTRAINT "TeachingPeriod_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TeachingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingPeriodPageRef" ADD CONSTRAINT "TeachingPeriodPageRef_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "TeachingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;