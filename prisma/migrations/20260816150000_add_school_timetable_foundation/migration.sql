-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "TimetableSlotType" AS ENUM ('TEACHING', 'BREAK', 'ASSEMBLY', 'LUNCH', 'OTHER');

-- CreateTable
CREATE TABLE "SchoolTimetableConfig" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "schoolStartMinute" INTEGER NOT NULL,
    "schoolEndMinute" INTEGER NOT NULL,
    "workingDays" "Weekday"[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolTimetableConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolPeriodSlot" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "type" "TimetableSlotType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolPeriodSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassTimetableEntry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "periodSlotId" TEXT NOT NULL,
    "sectionSubjectId" TEXT NOT NULL,
    "teacherAssignmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassTimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolTimetableConfig_schoolId_academicYearId_key" ON "SchoolTimetableConfig"("schoolId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolPeriodSlot_schoolId_academicYearId_sequence_key" ON "SchoolPeriodSlot"("schoolId", "academicYearId", "sequence");

-- CreateIndex
CREATE INDEX "SchoolPeriodSlot_schoolId_academicYearId_startMinute_idx" ON "SchoolPeriodSlot"("schoolId", "academicYearId", "startMinute");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTimetableEntry_academicYearId_sectionId_weekday_periodSlotId_key" ON "ClassTimetableEntry"("academicYearId", "sectionId", "weekday", "periodSlotId");

-- CreateIndex
CREATE INDEX "ClassTimetableEntry_teacherAssignmentId_weekday_periodSlotId_idx" ON "ClassTimetableEntry"("teacherAssignmentId", "weekday", "periodSlotId");

-- CreateIndex
CREATE INDEX "ClassTimetableEntry_sectionSubjectId_weekday_periodSlotId_idx" ON "ClassTimetableEntry"("sectionSubjectId", "weekday", "periodSlotId");

-- CreateIndex
CREATE INDEX "ClassTimetableEntry_schoolId_academicYearId_weekday_periodSlotId_idx" ON "ClassTimetableEntry"("schoolId", "academicYearId", "weekday", "periodSlotId");

-- AddForeignKey
ALTER TABLE "SchoolTimetableConfig" ADD CONSTRAINT "SchoolTimetableConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolTimetableConfig" ADD CONSTRAINT "SchoolTimetableConfig_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolPeriodSlot" ADD CONSTRAINT "SchoolPeriodSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolPeriodSlot" ADD CONSTRAINT "SchoolPeriodSlot_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableEntry" ADD CONSTRAINT "ClassTimetableEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableEntry" ADD CONSTRAINT "ClassTimetableEntry_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableEntry" ADD CONSTRAINT "ClassTimetableEntry_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ClassSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableEntry" ADD CONSTRAINT "ClassTimetableEntry_periodSlotId_fkey" FOREIGN KEY ("periodSlotId") REFERENCES "SchoolPeriodSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableEntry" ADD CONSTRAINT "ClassTimetableEntry_sectionSubjectId_fkey" FOREIGN KEY ("sectionSubjectId") REFERENCES "SectionSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableEntry" ADD CONSTRAINT "ClassTimetableEntry_teacherAssignmentId_fkey" FOREIGN KEY ("teacherAssignmentId") REFERENCES "TeacherAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
