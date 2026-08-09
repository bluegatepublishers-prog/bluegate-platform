import "server-only";

import type { TeachingPlanReadModel } from "@/lib/teaching-plan";
import { getSchoolTeachingPlanPagePreview, getTeachingPlanForSchool, TeachingPlanError } from "@/lib/teaching-plan";
import { prisma } from "@/lib/prisma";
import { requireSchool } from "@/lib/school-dashboard";

export type SchoolTeachingPlanFilters = {
  academicYearId?: string;
  sectionId?: string;
  sectionSubjectId?: string;
  teacherId?: string;
  bookId?: string;
};

export type SchoolTeachingPlanSummary = {
  id: string;
  academicYearId: string;
  academicYearName: string;
  sectionId: string;
  sectionName: string;
  className: string;
  sectionSubjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  bookId: string;
  bookTitle: string;
  periodCount: number;
  mappedPageCount: number;
};

export type SchoolTeachingPlanDetail = SchoolTeachingPlanSummary & {
  periods: TeachingPlanReadModel["periods"];
  plannerContext: Array<{
    id: string;
    title: string;
    currentDate: Date;
    status: string;
  }>;
};

export type SchoolTeachingPlanPageData = {
  years: Array<{ id: string; name: string; current: boolean; active: boolean }>;
  sections: Array<{ id: string; name: string; className: string }>;
  subjects: Array<{ id: string; name: string }>;
  teachers: Array<{ id: string; name: string }>;
  books: Array<{ id: string; title: string }>;
  plans: SchoolTeachingPlanSummary[];
  selectedPlan: SchoolTeachingPlanDetail | null;
  selectedAcademicYearId: string;
};

type SchoolPlanRow = {
  id: string;
  academicYearId: string;
  academicYear: { id: string; name: string };
  sectionSubjectId: string;
  sectionSubject: {
    id: string;
    subject: { id: string; name: string };
    section: { id: string; name: string; schoolClass: { id: string; name: string } };
  };
  teacherId: string;
  teacher: { id: string; user: { name: string } };
  bookId: string;
  book: { id: string; title: string };
  periods: Array<{ pageRefs: Array<{ id: string }> }>;
};

function filterId(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned && cleaned.length <= 128 ? cleaned : undefined;
}

function schoolPlanWhere(schoolId: string, publisherId: string, academicYearId: string, filters: SchoolTeachingPlanFilters = {}) {
  return {
    schoolId,
    academicYearId,
    ...(filters.sectionSubjectId ? { sectionSubjectId: filters.sectionSubjectId } : {}),
    ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
    ...(filters.bookId ? { bookId: filters.bookId } : {}),
    sectionSubject: {
      active: true,
      subject: { active: true },
      section: {
        ...(filters.sectionId ? { id: filters.sectionId } : {}),
        active: true,
        schoolClass: { schoolId, academicYearId, active: true },
      },
    },
    teacher: { schoolId, active: true, status: "APPROVED" as const },
    book: {
      publisherId,
      published: true,
      archived: false,
      schoolEntitlements: { some: { schoolId, publisherId, status: "ACTIVE" as const } },
    },
  };
}

async function resolveAcademicYear(schoolId: string, academicYearId?: string) {
  const years = await prisma.academicYear.findMany({
    where: { schoolId },
    select: { id: true, name: true, current: true, active: true },
    orderBy: [{ current: "desc" }, { startDate: "desc" }, { id: "asc" }],
  });
  const requested = filterId(academicYearId);
  const selected = years.find((year) => year.id === requested)
    ?? years.find((year) => year.current && year.active)
    ?? years.find((year) => year.active)
    ?? years[0];
  return { years, selected };
}

async function findSchoolPlanRows(schoolId: string, publisherId: string, academicYearId: string, filters: SchoolTeachingPlanFilters = {}) {
  return prisma.teachingPlan.findMany({
    where: schoolPlanWhere(schoolId, publisherId, academicYearId, filters),
    select: {
      id: true,
      academicYearId: true,
      academicYear: { select: { id: true, name: true } },
      sectionSubjectId: true,
      sectionSubject: {
        select: {
          id: true,
          subject: { select: { id: true, name: true } },
          section: { select: { id: true, name: true, schoolClass: { select: { id: true, name: true } } } },
        },
      },
      teacherId: true,
      teacher: { select: { id: true, user: { select: { name: true } } } },
      bookId: true,
      book: { select: { id: true, title: true } },
      periods: { select: { pageRefs: { select: { id: true } } } },
    },
    orderBy: [
      { sectionSubject: { section: { schoolClass: { sortOrder: "asc" } } } },
      { sectionSubject: { section: { name: "asc" } } },
      { sectionSubject: { subject: { name: "asc" } } },
      { book: { title: "asc" } },
      { id: "asc" },
    ],
  }) as unknown as SchoolPlanRow[];
}

function toSummary(row: SchoolPlanRow): SchoolTeachingPlanSummary {
  return {
    id: row.id,
    academicYearId: row.academicYearId,
    academicYearName: row.academicYear.name,
    sectionId: row.sectionSubject.section.id,
    sectionName: row.sectionSubject.section.name,
    className: row.sectionSubject.section.schoolClass.name,
    sectionSubjectId: row.sectionSubjectId,
    subjectName: row.sectionSubject.subject.name,
    teacherId: row.teacherId,
    teacherName: row.teacher.user.name,
    bookId: row.bookId,
    bookTitle: row.book.title,
    periodCount: row.periods.length,
    mappedPageCount: row.periods.reduce((count, period) => count + period.pageRefs.length, 0),
  };
}

function optionsFromRows(rows: SchoolPlanRow[]) {
  const unique = <T extends { id: string }>(items: T[]) => [...new Map(items.map((item) => [item.id, item])).values()];
  return {
    sections: unique(rows.map((row) => ({
      id: row.sectionSubject.section.id,
      name: row.sectionSubject.section.name,
      className: row.sectionSubject.section.schoolClass.name,
    })).sort((left, right) => `${left.className} ${left.name}`.localeCompare(`${right.className} ${right.name}`))),
    subjects: unique(rows.map((row) => ({ id: row.sectionSubject.subject.id, name: row.sectionSubject.subject.name })).sort((left, right) => left.name.localeCompare(right.name))),
    teachers: unique(rows.map((row) => ({ id: row.teacher.id, name: row.teacher.user.name })).sort((left, right) => left.name.localeCompare(right.name))),
    books: unique(rows.map((row) => ({ id: row.book.id, title: row.book.title })).sort((left, right) => left.title.localeCompare(right.title))),
  };
}

export async function listSchoolTeachingPlans(filters: SchoolTeachingPlanFilters = {}) {
  const school = await requireSchool();
  const { selected } = await resolveAcademicYear(school.id, filters.academicYearId);
  if (!selected) return [];
  const rows = await findSchoolPlanRows(school.id, school.publisherId ?? "", selected.id, {
    sectionId: filterId(filters.sectionId),
    sectionSubjectId: filterId(filters.sectionSubjectId),
    teacherId: filterId(filters.teacherId),
    bookId: filterId(filters.bookId),
  });
  return rows.map(toSummary);
}

export async function getSchoolTeachingPlan(planId: string): Promise<SchoolTeachingPlanDetail> {
  const school = await requireSchool();
  const id = filterId(planId);
  const plan = id
    ? await prisma.teachingPlan.findFirst({
        where: {
          id,
          schoolId: school.id,
          book: {
            publisherId: school.publisherId ?? "",
            published: true,
            archived: false,
            schoolEntitlements: { some: { schoolId: school.id, publisherId: school.publisherId ?? "", status: "ACTIVE" as const } },
          },
        },
        select: {
          id: true,
          academicYearId: true,
          academicYear: { select: { id: true, name: true } },
          sectionSubjectId: true,
          sectionSubject: {
            select: {
              id: true,
              subject: { select: { id: true, name: true } },
              section: { select: { id: true, name: true, schoolClass: { select: { id: true, name: true } } } },
            },
          },
          teacherId: true,
          teacher: { select: { id: true, user: { select: { name: true } } } },
          bookId: true,
          book: { select: { id: true, title: true } },
          periods: { select: { pageRefs: { select: { id: true } } } },
        },
      })
    : null;
  if (!plan) throw new TeachingPlanError("PLAN_NOT_FOUND", "Teaching plan is not available.");
  const [normalized, plannerContext] = await Promise.all([
    getTeachingPlanForSchool(plan.id),
    prisma.academicPlannerItem.findMany({
      where: {
        schoolId: school.id,
        academicYearId: plan.academicYearId,
        sectionId: plan.sectionSubject.section.id,
        sectionSubjectId: plan.sectionSubjectId,
        type: "TEACHING",
      },
      select: { id: true, title: true, currentDate: true, status: true },
      orderBy: [{ currentDate: "asc" }, { id: "asc" }],
      take: 30,
    }),
  ]);
  return {
    ...toSummary(plan as unknown as SchoolPlanRow),
    periods: normalized.periods,
    plannerContext,
  };
}

export async function getSchoolTeachingPlanPageData(
  filters: SchoolTeachingPlanFilters = {},
  planId?: string,
): Promise<SchoolTeachingPlanPageData> {
  const school = await requireSchool();
  const { years, selected } = await resolveAcademicYear(school.id, filters.academicYearId);
  if (!selected) {
    return { years, sections: [], subjects: [], teachers: [], books: [], plans: [], selectedPlan: null, selectedAcademicYearId: "" };
  }
  const rows = await findSchoolPlanRows(school.id, school.publisherId ?? "", selected.id);
  const optionData = optionsFromRows(rows);
  const plans = rows
    .filter((row) => !filters.sectionId || row.sectionSubject.section.id === filters.sectionId)
    .filter((row) => !filters.sectionSubjectId || row.sectionSubjectId === filters.sectionSubjectId)
    .filter((row) => !filters.teacherId || row.teacherId === filters.teacherId)
    .filter((row) => !filters.bookId || row.bookId === filters.bookId)
    .map(toSummary);
  let selectedPlan: SchoolTeachingPlanDetail | null = null;
  if (planId && plans.some((plan) => plan.id === planId)) {
    selectedPlan = await getSchoolTeachingPlan(planId);
  }
  return {
    years,
    ...optionData,
    plans,
    selectedPlan,
    selectedAcademicYearId: selected.id,
  };
}

export async function getSchoolTeachingPlanPreview(input: { planId: string; periodId: string; pageRefId: string }) {
  return getSchoolTeachingPlanPagePreview(input);
}
