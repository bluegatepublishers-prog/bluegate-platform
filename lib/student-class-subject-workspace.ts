import "server-only";

import { getStudentAssignments } from "@/lib/assignments/queries";
import { getStudentAssessments } from "@/lib/student-assessments";
import { getStudentSubjectWorkspace } from "@/lib/student-workspaces";
import { loadSmartBookStructuredContent } from "@/lib/content-delivery";
import { APPLICATION_TIME_ZONE } from "@/lib/application-timezone";
import { prisma } from "@/lib/prisma";
import { studentAssessmentState, studentAssignmentState } from "@/lib/student-class-subject-workspace-policy";

type AssignmentRow = Awaited<ReturnType<typeof getStudentAssignments>>["assignments"][number];
type AssessmentResult = Awaited<ReturnType<typeof getStudentAssessments>>;
type AssessmentRow = AssessmentResult["assessments"][number];

export { studentAssessmentState, studentAssignmentState };

function calendarDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: APPLICATION_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function calendarDayStart(value: Date) {
  return new Date(calendarDateKey(value) + "T00:00:00.000Z");
}

function calendarDayEnd(value: Date) {
  const start = calendarDayStart(value);
  start.setUTCDate(start.getUTCDate() + 1);
  return start;
}

async function loadTodayLearning(input: {
  identity: Awaited<ReturnType<typeof import("@/lib/student-dashboard").requireStudent>>;
  sectionSubjectId: string;
  bookId: string;
}) {
  const start = calendarDayStart(new Date());
  const end = calendarDayEnd(new Date());
  const period = await prisma.teachingPeriod.findFirst({
    where: {
      plannedDate: { gte: start, lt: end },
      status: { not: "SKIPPED" },
      plan: {
        schoolId: input.identity.school.id,
        academicYearId: input.identity.academicYear.id,
        sectionSubjectId: input.sectionSubjectId,
        bookId: input.bookId,
      },
      timetableEntry: {
        is: {
          schoolId: input.identity.school.id,
          academicYearId: input.identity.academicYear.id,
          sectionId: input.identity.enrollment.sectionId,
          sectionSubjectId: input.sectionSubjectId,
        },
      },
    },
    orderBy: [{ sequence: "asc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      plannedDate: true,
      status: true,
      chapter: { select: { id: true, chapterNumber: true, title: true } },
      objective: true,
      timetableEntry: { select: { periodSlot: { select: { label: true, startMinute: true, endMinute: true } } } },
      pageRefs: { orderBy: [{ sequence: "asc" }, { id: "asc" }], select: { pageId: true, moduleId: true, sequence: true } },
    },
  });
  if (!period) return null;

  let page: { pageId: string; moduleId: string | null; pageNumber: number; href: string } | null = null;
  try {
    const rendered = await loadSmartBookStructuredContent({
      publisherId: input.identity.publisher.id,
      bookId: input.bookId,
      mode: "STUDENT",
      requirePublishedRelease: true,
    });
    const first = period.pageRefs
      .map((ref) => rendered?.document.pageLayout?.pages.find((candidate) => candidate.id === ref.pageId))
      .find((candidate) => typeof candidate?.pdfBackground?.pageNumber === "number");
    if (first?.pdfBackground?.pageNumber) {
      page = {
        pageId: first.id,
        moduleId: period.pageRefs.find((ref) => ref.pageId === first.id)?.moduleId ?? null,
        pageNumber: first.pdfBackground.pageNumber,
        href: `/student-dashboard/books/${input.bookId}?page=${first.pdfBackground.pageNumber}`,
      };
    }
  } catch {
    page = null;
  }

  return {
    id: period.id,
    title: period.title,
    plannedDate: period.plannedDate?.toISOString() ?? null,
    status: period.status,
    chapter: period.chapter,
    objective: period.objective,
    periodSlot: period.timetableEntry?.periodSlot ?? null,
    page,
  };
}

async function safeAssignments() {
  try {
    return (await getStudentAssignments()).assignments;
  } catch {
    return [] as AssignmentRow[];
  }
}

async function safeAssessments() {
  try {
    const result = await getStudentAssessments();
    return { state: result.state, assessments: result.assessments };
  } catch {
    return { state: "UNAVAILABLE" as const, assessments: [] as AssessmentRow[] };
  }
}

export async function getStudentClassSubjectWorkspace(sectionSubjectId: string) {
  const base = await getStudentSubjectWorkspace(sectionSubjectId);
  if (!base) return null;
  const [assignments, assessmentResult, todayLearning] = await Promise.all([
    safeAssignments(),
    safeAssessments(),
    base.subject.book
      ? loadTodayLearning({ identity: base.identity, sectionSubjectId, bookId: base.subject.book.id })
      : Promise.resolve(null),
  ]);
  const subjectAssignments = assignments.filter((item) => item.sectionSubjectId === sectionSubjectId);
  const subjectAssessments = assessmentResult.assessments.filter((item) => item.sectionSubjectId === sectionSubjectId);
  const todayAssignments = todayLearning ? subjectAssignments.filter((item) => item.teachingPeriodId === todayLearning.id) : [];
  const todayAssessments = todayLearning ? subjectAssessments.filter((item) => item.teachingPeriodId === todayLearning.id) : [];
  const now = new Date();
  const toDo = subjectAssignments.filter((item) => ["To Do", "Draft Saved", "Returned", "Resubmitted", "Overdue"].includes(studentAssignmentState(item, now)));
  const actionableAssessments = subjectAssessments.filter((item) => ["START", "CONTINUE"].includes(item.availability));
  const upcoming = [
    ...subjectAssignments.filter((item) => item.dueAt && new Date(item.dueAt) >= now).map((item) => ({ kind: "ASSIGNMENT" as const, item })),
    ...subjectAssessments.filter((item) => item.availability === "UPCOMING").map((item) => ({ kind: "ASSESSMENT" as const, item })),
  ].sort((left, right) => {
    const leftDate = left.kind === "ASSIGNMENT" ? left.item.dueAt : left.item.opensAt ?? left.item.dueAt;
    const rightDate = right.kind === "ASSIGNMENT" ? right.item.dueAt : right.item.opensAt ?? right.item.dueAt;
    return (leftDate ? new Date(leftDate).getTime() : Number.MAX_SAFE_INTEGER) - (rightDate ? new Date(rightDate).getTime() : Number.MAX_SAFE_INTEGER);
  }).slice(0, 6);
  const recentResults = [
    ...subjectAssignments.filter((item) => studentAssignmentState(item, now) === "Graded").map((item) => ({ kind: "ASSIGNMENT" as const, item })),
    ...subjectAssessments.filter((item) => item.availability === "RESULT").map((item) => ({ kind: "ASSESSMENT" as const, item })),
  ].slice(0, 6);
  return {
    ...base,
    todayLearning,
    assignments: subjectAssignments,
    assessments: subjectAssessments,
    assessmentState: assessmentResult.state,
    todayAssignments,
    todayAssessments,
    toDo: [...toDo.map((item) => ({ kind: "ASSIGNMENT" as const, item })), ...actionableAssessments.map((item) => ({ kind: "ASSESSMENT" as const, item }))].slice(0, 8),
    upcoming,
    recentResults,
  };
}
