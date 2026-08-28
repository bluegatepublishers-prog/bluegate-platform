import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { getTeacherAiEntitlement } from "@/lib/ai/quota";
import { getTeacherEntitledBookIds } from "@/lib/entitlements/book";
import { getTeacherClasses } from "@/lib/classroom";
import { resolvePublishedSmartBookContent } from "@/lib/smart-book-release-runtime";

export async function getAiGenerations() {
  const teacher = await requireTeacher();
  return prisma.aiGeneration.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPromptTemplates() {
  const teacher = await requireTeacher();
  return prisma.promptTemplate.findMany({
    where: { teacherId: teacher.id },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getBuilderAcademicOptions() {
  const teacher = await requireTeacher();
  const bookIds = await getTeacherEntitledBookIds(teacher.userId);

  const [classes, subjects, books] = await Promise.all([
    prisma.class.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.subject.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.book.findMany({
      where: {
        id: { in: bookIds },
        publisherId: teacher.school?.publisherId,
        published: true,
      },
      select: {
        id: true,
        title: true,
        classId: true,
        subjectId: true,
        series: { select: { name: true } },
      },
      orderBy: { title: "asc" },
    }),
  ]);

  return { classes, subjects, books };
}

export async function getQuestionPaperWizardOptions() {
  const teacher = await requireTeacher();

  if (!teacher.schoolId || !teacher.school?.publisherId) {
    const entitlement = await getTeacherAiEntitlement(teacher.id);

    return {
      classes: [],
      subjects: [],
      books: [],
      contexts: [],
      entitlement: {
        plan: entitlement.plan,
        remaining: entitlement.remaining,
        limit: entitlement.limit,
        canGenerate: entitlement.canGenerate,
      },
    };
  }

  const [teacherClasses, entitlement] = await Promise.all([
    getTeacherClasses(),
    getTeacherAiEntitlement(teacher.id),
  ]);

  const sectionIds = [...new Set(
    teacherClasses.map((item) => item.sectionId),
  )];

  const sectionSubjectIds = [...new Set(
    teacherClasses.flatMap((item) =>
      item.subjects.map((subject) => subject.id),
    ),
  )];

  if (!sectionIds.length || !sectionSubjectIds.length) {
    return {
      classes: [],
      subjects: [],
      books: [],
      contexts: [],
      entitlement: {
        plan: entitlement.plan,
        remaining: entitlement.remaining,
        limit: entitlement.limit,
        canGenerate: entitlement.canGenerate,
      },
    };
  }

  const sectionSubjects = await prisma.sectionSubject.findMany({
    where: {
      id: { in: sectionSubjectIds },
      sectionId: { in: sectionIds },
      active: true,
      section: {
        active: true,
        schoolClass: {
          schoolId: teacher.schoolId,
          active: true,
          academicYear: {
            active: true,
            current: true,
            schoolId: teacher.schoolId,
          },
        },
      },
      subject: {
        active: true,
      },
      book: {
        publisherId: teacher.school.publisherId,
        published: true,
        archived: false,
        schoolEntitlements: {
          some: {
            schoolId: teacher.schoolId,
            publisherId: teacher.school.publisherId,
            status: "ACTIVE",
          },
        },
      },
    },
    select: {
      id: true,
      sectionId: true,
      subjectId: true,
      section: {
        select: {
          id: true,
          name: true,
          schoolClass: {
            select: {
              id: true,
              name: true,
              academicYearId: true,
            },
          },
        },
      },
      subject: {
        select: {
          id: true,
          name: true,
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          publisher: true,
          coverImage: true,
          classId: true,
          subjectId: true,
          series: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      { section: { schoolClass: { sortOrder: "asc" } } },
      { section: { name: "asc" } },
      { sortOrder: "asc" },
      { subject: { sortOrder: "asc" } },
    ],
  });

  const authorizedRows = sectionSubjects.filter((row) => {
    const teacherClass = teacherClasses.find(
      (item) => item.sectionId === row.sectionId,
    );

    if (!teacherClass) return false;

    if (
      teacherClass.academicYearId !==
      row.section.schoolClass.academicYearId
    ) {
      return false;
    }

    return teacherClass.subjects.some(
      (subject) =>
        subject.id === row.id &&
        subject.subjectId === row.subjectId,
    );
  });

  const uniqueBookIds = [...new Set(
    authorizedRows
      .map((row) => row.book?.id)
      .filter((id): id is string => Boolean(id)),
  )];

  const releaseEntries = await Promise.all(
    uniqueBookIds.map(async (bookId) => {
      const release = await resolvePublishedSmartBookContent({
        publisherId: teacher.school!.publisherId!,
        bookId,
      });

      return [bookId, release] as const;
    }),
  );

  const releases = new Map(releaseEntries);

  const contexts = authorizedRows
    .filter((row) => {
      if (!row.book) return false;
      return Boolean(releases.get(row.book.id));
    })
    .map((row) => {
      const book = row.book!;
      const release = releases.get(book.id)!;

      return {
        id: `${row.sectionId}:${row.id}:${book.id}`,
        sectionId: row.sectionId,
        sectionSubjectId: row.id,
        academicYearId: row.section.schoolClass.academicYearId,
        classId: row.section.schoolClass.id,
        className: row.section.schoolClass.name,
        sectionName: row.section.name,
        subjectId: row.subject.id,
        subjectName: row.subject.name,
        bookId: book.id,
        bookTitle: release.manifest.book.title,
        releaseVersionId: release.releaseVersionId,
        releaseVersionNumber: release.versionNumber,
      };
    });

  const classMap = new Map<
    string,
    { id: string; name: string }
  >();

  const subjectMap = new Map<
    string,
    { id: string; name: string }
  >();

  for (const row of authorizedRows) {
    if (!row.book || !releases.get(row.book.id)) continue;

    classMap.set(row.section.schoolClass.id, {
      id: row.section.schoolClass.id,
      name: row.section.schoolClass.name,
    });

    subjectMap.set(row.subject.id, {
      id: row.subject.id,
      name: row.subject.name,
    });
  }

  const books = uniqueBookIds.flatMap((bookId) => {
    const release = releases.get(bookId);
    if (!release) return [];

    const rows = authorizedRows.filter(
      (row) => row.book?.id === bookId,
    );

    const first = rows[0];
    if (!first?.book) return [];

    const chapterNodes = release.manifest.hierarchy
      .filter(
        (node) =>
          node.kind === "CHAPTER" &&
          node.releaseVisible === true,
      )
      .sort(
        (a, b) =>
          a.displayOrder - b.displayOrder ||
          (a.number ?? Number.MAX_SAFE_INTEGER) -
            (b.number ?? Number.MAX_SAFE_INTEGER) ||
          a.title.localeCompare(b.title),
      );

    const bookContexts = contexts.filter(
      (context) => context.bookId === bookId,
    );

    return [{
      id: first.book.id,
      title: release.manifest.book.title,

      // Compatibility fields retained until B-2 replaces the wizard UI.
      classId: first.section.schoolClass.id,
      subjectId: first.subject.id,
      className: first.section.schoolClass.name,
      subjectName: first.subject.name,

      series: first.book.series?.name ?? null,
      publisher: first.book.publisher,
      coverImage: first.book.coverImage,
      summary:
        release.manifest.book.subtitle ??
        release.manifest.book.edition ??
        null,

      releaseVersionId: release.releaseVersionId,
      releaseVersionNumber: release.versionNumber,

      contexts: bookContexts,

      chapters: chapterNodes.map((chapter) => ({
        id: chapter.sourceId,
        chapterNumber: chapter.number ?? 0,
        title: chapter.title,

        // AI readiness now means that this chapter exists in the
        // exact published immutable V2 release.
        aiReady: true,
        releaseReady: true,

        startPage: chapter.startPage,
        endPage: chapter.endPage,

        // Legacy display counters remain only for B-1 compatibility.
        // They are intentionally NOT calculated from mutable authoring rows.
        learningOutcomesCount: 0,
        questionBankCount: 0,
      })),
    }];
  });

  return {
    classes: [...classMap.values()],
    subjects: [...subjectMap.values()],
    books,
    contexts,
    entitlement: {
      plan: entitlement.plan,
      remaining: entitlement.remaining,
      limit: entitlement.limit,
      canGenerate: entitlement.canGenerate,
    },
  };
}
