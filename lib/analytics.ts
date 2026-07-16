import "server-only";

import { AnalyticsSkillDimension, LearningActivityType, Prisma, StudentAiIntent } from "@prisma/client";
import { average, calculateStreaks, percent, weightedCompletion } from "@/lib/analytics-policy";

type Tx = Prisma.TransactionClient;

export type LearningActivityInput = {
  eventKey: string;
  publisherId: string;
  schoolId: string;
  studentId: string;
  academicYearId: string;
  activityType: LearningActivityType;
  title: string;
  sourceType: string;
  sourceId: string;
  occurredAt: Date;
  subjectId?: string | null;
  bookId?: string | null;
  chapterId?: string | null;
  completed?: boolean;
  provisional?: boolean;
  scorePercent?: number | null;
  progressValue?: number | null;
  totalValue?: number | null;
  durationSeconds?: number | null;
  aiIntent?: StudentAiIntent | null;
};

const latestBySource = <T extends { sourceType: string; sourceId: string; occurredAt: Date }>(rows: T[]) => {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.sourceType}:${row.sourceId}`;
    if (!latest.has(key) || latest.get(key)!.occurredAt < row.occurredAt) latest.set(key, row);
  }
  return [...latest.values()];
};

const activityPercent = (row: { scorePercent: number | null; progressValue: number | null; totalValue: number | null; completed: boolean }) =>
  row.progressValue != null && row.totalValue ? percent(row.progressValue, row.totalValue) : row.scorePercent ?? (row.completed ? 100 : 0);

function rankedFacts(rows: Array<{ key: string; value: number | null | undefined }>) {
  const groups = new Map<string, number[]>();
  for (const row of rows) if (typeof row.value === "number") groups.set(row.key, [...(groups.get(row.key) ?? []), row.value]);
  return [...groups].map(([key, values]) => ({ key, averagePercent: average(values), activityCount: values.length })).sort((a, b) => (b.averagePercent ?? 0) - (a.averagePercent ?? 0));
}

function countedFacts(values: Array<string | null>) {
  const counts = new Map<string, number>();
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

async function refreshStudent(tx: Tx, input: LearningActivityInput) {
  const timeline = await tx.learningTimeline.findMany({
    where: { studentId: input.studentId, academicYearId: input.academicYearId },
    orderBy: { occurredAt: "asc" },
  });
  const canonical = latestBySource(timeline);
  const reading = canonical.filter((row) => row.activityType === LearningActivityType.READING);
  const revision = canonical.filter((row) => row.activityType === LearningActivityType.REVISION);
  const practice = canonical.filter((row) => row.activityType === LearningActivityType.PRACTICE);
  const assessment = canonical.filter((row) => row.activityType === LearningActivityType.ASSESSMENT);
  const scoredAssessment = assessment.filter((row) => row.completed && !row.provisional);
  const ai = canonical.filter((row) => row.activityType === LearningActivityType.STUDENT_AI);
  const streaks = calculateStreaks(timeline, input.occurredAt);
  const values = {
    publisherId: input.publisherId,
    schoolId: input.schoolId,
    booksStarted: reading.length,
    booksCompleted: reading.filter((row) => row.completed).length,
    pagesRead: Math.round(reading.reduce((sum, row) => sum + (row.progressValue ?? 0), 0)),
    readingPercent: weightedCompletion(reading.map(activityPercent)),
    revisionsStarted: revision.length,
    revisionsCompleted: revision.filter((row) => row.completed).length,
    revisionPercent: weightedCompletion(revision.map(activityPercent)),
    practicesStarted: practice.length,
    practicesCompleted: practice.filter((row) => row.completed).length,
    practicePercent: percent(practice.filter((row) => row.completed).length, practice.length),
    averagePractice: average(practice.filter((row) => row.completed).map((row) => row.scorePercent)),
    assessmentsStarted: assessment.length,
    assessmentsCompleted: assessment.filter((row) => row.completed).length,
    assessmentPercent: percent(assessment.filter((row) => row.completed).length, assessment.length),
    averageAssessment: average(scoredAssessment.map((row) => row.scorePercent)),
    aiSessions: new Set(ai.map((row) => row.sourceType)).size,
    aiRequests: ai.length,
    timeStudiedSeconds: canonical.reduce((sum, row) => sum + (row.durationSeconds ?? 0), 0),
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    lastActivityAt: timeline.at(-1)?.occurredAt ?? null,
  };
  await tx.studentAnalytics.upsert({
    where: { studentId_academicYearId: { studentId: input.studentId, academicYearId: input.academicYearId } },
    update: values,
    create: { ...values, studentId: input.studentId, academicYearId: input.academicYearId },
  });

  const subjectIds = new Set(canonical.map((row) => row.subjectId).filter((id): id is string => Boolean(id)));
  for (const subjectId of subjectIds) {
    const rows = canonical.filter((row) => row.subjectId === subjectId);
    const r = rows.filter((row) => row.activityType === LearningActivityType.READING);
    const p = rows.filter((row) => row.activityType === LearningActivityType.PRACTICE && row.completed);
    const a = rows.filter((row) => row.activityType === LearningActivityType.ASSESSMENT && row.completed && !row.provisional);
    const rv = rows.filter((row) => row.activityType === LearningActivityType.REVISION);
    const data = {
      publisherId: input.publisherId,
      schoolId: input.schoolId,
      booksStarted: r.length,
      booksCompleted: r.filter((row) => row.completed).length,
      readingPercent: weightedCompletion(r.map(activityPercent)),
      revisionsCompleted: rv.filter((row) => row.completed).length,
      revisionPercent: weightedCompletion(rv.map(activityPercent)),
      practicesCompleted: p.length,
      averagePractice: average(p.map((row) => row.scorePercent)),
      assessmentsCompleted: a.length,
      averageAssessment: average(a.map((row) => row.scorePercent)),
      aiRequests: rows.filter((row) => row.activityType === LearningActivityType.STUDENT_AI).length,
      completionPercent: weightedCompletion(rows.map(activityPercent)),
      lastActivityAt: rows.at(-1)?.occurredAt ?? null,
      lastScoredAt: [...p, ...a].map((row) => row.occurredAt).sort((left, right) => +right - +left)[0] ?? null,
    };
    await tx.studentSubjectAnalytics.upsert({
      where: { studentId_academicYearId_subjectId: { studentId: input.studentId, academicYearId: input.academicYearId, subjectId } },
      update: data,
      create: { ...data, studentId: input.studentId, academicYearId: input.academicYearId, subjectId },
    });
  }

  const chapterIds = new Set(canonical.map((row) => row.chapterId).filter((id): id is string => Boolean(id)));
  for (const chapterId of chapterIds) {
    const rows = canonical.filter((row) => row.chapterId === chapterId);
    const bookId = rows.find((row) => row.bookId)?.bookId;
    if (!bookId) continue;
    const rv = rows.filter((row) => row.activityType === LearningActivityType.REVISION);
    const p = rows.filter((row) => row.activityType === LearningActivityType.PRACTICE && row.completed);
    const a = rows.filter((row) => row.activityType === LearningActivityType.ASSESSMENT && row.completed && !row.provisional);
    const data = {
      publisherId: input.publisherId,
      schoolId: input.schoolId,
      bookId,
      revisionPercent: weightedCompletion(rv.map(activityPercent)),
      practicesCompleted: p.length,
      averagePractice: average(p.map((row) => row.scorePercent)),
      assessmentsCompleted: a.length,
      averageAssessment: average(a.map((row) => row.scorePercent)),
      aiRequests: rows.filter((row) => row.activityType === LearningActivityType.STUDENT_AI).length,
      completionPercent: weightedCompletion(rows.map(activityPercent)),
      lastActivityAt: rows.at(-1)?.occurredAt ?? null,
      lastScoredAt: [...p, ...a].map((row) => row.occurredAt).sort((left, right) => +right - +left)[0] ?? null,
    };
    await tx.studentChapterAnalytics.upsert({
      where: { studentId_academicYearId_chapterId: { studentId: input.studentId, academicYearId: input.academicYearId, chapterId } },
      update: data,
      create: { ...data, studentId: input.studentId, academicYearId: input.academicYearId, chapterId },
    });
  }
}

async function refreshSkillAnalytics(tx: Tx, input: LearningActivityInput) {
  if (input.activityType !== LearningActivityType.ASSESSMENT || input.provisional) return;
  const responses = await tx.assessmentResponse.findMany({
    where: {
      attempt: { studentId: input.studentId, academicYearId: input.academicYearId, result: { provisional: false } },
      marksAwarded: { not: null },
      reviewStatus: { not: "PENDING" },
    },
    select: {
      marksAwarded: true,
      reviewedAt: true,
      answeredAt: true,
      attempt: { select: { assessment: { select: { book: { select: { subjectId: true } } } } } },
      assessmentQuestion: { select: { marks: true, competency: true, learningOutcome: true } },
    },
  });
  for (const dimension of [AnalyticsSkillDimension.COMPETENCY, AnalyticsSkillDimension.LEARNING_OUTCOME]) {
    const groups = new Map<string, typeof responses>();
    for (const response of responses) {
      const label = dimension === AnalyticsSkillDimension.COMPETENCY ? response.assessmentQuestion.competency : response.assessmentQuestion.learningOutcome;
      const subjectId = response.attempt.assessment.book.subjectId;
      const key = label?.trim() ? `${subjectId}:${label.trim().toLocaleLowerCase("en-IN")}` : null;
      if (key) groups.set(key, [...(groups.get(key) ?? []), response]);
    }
    for (const [skillKey, rows] of groups) {
      const subjectId = rows[0].attempt.assessment.book.subjectId;
      const skillLabel = (dimension === AnalyticsSkillDimension.COMPETENCY ? rows[0].assessmentQuestion.competency : rows[0].assessmentQuestion.learningOutcome)!.trim();
      const totalMarks = rows.reduce((sum, row) => sum + row.assessmentQuestion.marks, 0);
      const awardedMarks = rows.reduce((sum, row) => sum + (row.marksAwarded ?? 0), 0);
      const dates = rows.map((row) => row.reviewedAt ?? row.answeredAt).filter((date): date is Date => Boolean(date));
      const data = { publisherId: input.publisherId, schoolId: input.schoolId, subjectId, skillLabel, attempts: rows.length, totalMarks, awardedMarks, averagePercent: totalMarks ? percent(awardedMarks, totalMarks) : null, lastAssessedAt: dates.sort((a, b) => +b - +a)[0] ?? null };
      await tx.studentSkillAnalytics.upsert({
        where: { studentId_academicYearId_dimension_skillKey: { studentId: input.studentId, academicYearId: input.academicYearId, dimension, skillKey } },
        update: data,
        create: { ...data, studentId: input.studentId, academicYearId: input.academicYearId, dimension, skillKey },
      });
    }
  }
}

async function refreshRoleAnalytics(tx: Tx, input: LearningActivityInput) {
  const students = await tx.studentAnalytics.findMany({ where: { schoolId: input.schoolId, academicYearId: input.academicYearId } });
  const [subjectFacts, chapterFacts, skillFacts, schoolTimeline] = await Promise.all([
    tx.studentSubjectAnalytics.findMany({ where: { schoolId: input.schoolId, academicYearId: input.academicYearId } }),
    tx.studentChapterAnalytics.findMany({ where: { schoolId: input.schoolId, academicYearId: input.academicYearId } }),
    tx.studentSkillAnalytics.findMany({ where: { schoolId: input.schoolId, academicYearId: input.academicYearId } }),
    tx.learningTimeline.findMany({ where: { schoolId: input.schoolId, academicYearId: input.academicYearId } }),
  ]);
  const totalStudents = await tx.student.count({ where: { schoolId: input.schoolId } });
  const activeStudents = await tx.studentEnrollment.count({ where: { schoolId: input.schoolId, academicYearId: input.academicYearId, status: "ACTIVE" } });
  const teacherCount = await tx.teacher.count({ where: { schoolId: input.schoolId, active: true } });
  const roleData = {
    publisherId: input.publisherId,
    totalStudents,
    activeStudents,
    participatingStudents: students.filter((row) => row.lastActivityAt).length,
    totalTeachers: teacherCount,
    averageReading: average(students.map((row) => row.readingPercent)),
    averageRevision: average(students.map((row) => row.revisionPercent)),
    averagePractice: average(students.map((row) => row.averagePractice)),
    averageAssessment: average(students.map((row) => row.averageAssessment)),
    aiSessions: students.reduce((sum, row) => sum + row.aiSessions, 0),
    aiRequests: students.reduce((sum, row) => sum + row.aiRequests, 0),
    subjectPerformance: rankedFacts(subjectFacts.map((row) => ({ key: row.subjectId, value: row.completionPercent }))),
    bookPerformance: rankedFacts(chapterFacts.map((row) => ({ key: row.bookId, value: row.completionPercent }))),
    chapterPerformance: rankedFacts(chapterFacts.map((row) => ({ key: row.chapterId, value: row.averageAssessment ?? row.averagePractice ?? row.completionPercent }))),
    assessmentPerformance: rankedFacts(schoolTimeline.filter((row) => row.activityType === LearningActivityType.ASSESSMENT).map((row) => ({ key: row.sourceId, value: row.scorePercent }))),
    skillPerformance: rankedFacts(skillFacts.map((row) => ({ key: `${row.dimension}:${row.skillLabel ?? row.skillKey}`, value: row.averagePercent }))),
    lastActivityAt: students.map((row) => row.lastActivityAt).filter((date): date is Date => Boolean(date)).sort((a, b) => +b - +a)[0] ?? null,
  };
  await tx.schoolAnalytics.upsert({
    where: { schoolId_academicYearId: { schoolId: input.schoolId, academicYearId: input.academicYearId } },
    update: roleData,
    create: { ...roleData, schoolId: input.schoolId, academicYearId: input.academicYearId },
  });

  const assignments = await tx.teacherAssignment.findMany({ where: { schoolId: input.schoolId, academicYearId: input.academicYearId, active: true }, select: { teacherId: true, subjectId: true, sectionId: true } });
  const assignmentScopes = new Map<string, { teacherId: string; subjectId: string | null; sectionIds: string[] }>();
  for (const assignment of assignments) {
    const key = `${assignment.teacherId}:${assignment.subjectId ?? "ALL"}`;
    const scope = assignmentScopes.get(key) ?? { teacherId: assignment.teacherId, subjectId: assignment.subjectId, sectionIds: [] };
    scope.sectionIds.push(assignment.sectionId);
    assignmentScopes.set(key, scope);
  }
  for (const assignment of assignmentScopes.values()) {
    const enrollmentRows = await tx.studentEnrollment.findMany({ where: { academicYearId: input.academicYearId, sectionId: { in: assignment.sectionIds }, status: "ACTIVE" }, select: { studentId: true } });
    const ids = enrollmentRows.map((row) => row.studentId);
    const scoped = assignment.subjectId
      ? await tx.studentSubjectAnalytics.findMany({ where: { academicYearId: input.academicYearId, studentId: { in: ids }, subjectId: assignment.subjectId } })
      : await tx.studentAnalytics.findMany({ where: { academicYearId: input.academicYearId, studentId: { in: ids } } });
    const teacherChapters = await tx.studentChapterAnalytics.findMany({ where: { academicYearId: input.academicYearId, studentId: { in: ids }, ...(assignment.subjectId ? { book: { subjectId: assignment.subjectId } } : {}) } });
    const teacherSkills = await tx.studentSkillAnalytics.findMany({ where: { academicYearId: input.academicYearId, studentId: { in: ids } } });
    const data = {
      publisherId: input.publisherId,
      schoolId: input.schoolId,
      studentCount: ids.length,
      participatingStudents: scoped.filter((row) => row.lastActivityAt).length,
      averageReading: average(scoped.map((row) => row.readingPercent)),
      averageRevision: average(scoped.map((row) => "revisionPercent" in row ? row.revisionPercent : null)),
      averagePractice: average(scoped.map((row) => row.averagePractice)),
      averageAssessment: average(scoped.map((row) => row.averageAssessment)),
      aiSessions: assignment.subjectId ? 0 : scoped.reduce((sum, row) => sum + ("aiSessions" in row ? row.aiSessions : 0), 0),
      aiRequests: scoped.reduce((sum, row) => sum + row.aiRequests, 0),
      chapterPerformance: rankedFacts(teacherChapters.map((row) => ({ key: row.chapterId, value: row.averageAssessment ?? row.averagePractice ?? row.completionPercent }))),
      skillPerformance: rankedFacts(teacherSkills.map((row) => ({ key: `${row.dimension}:${row.skillLabel ?? row.skillKey}`, value: row.averagePercent }))),
      lastActivityAt: scoped.map((row) => row.lastActivityAt).filter((date): date is Date => Boolean(date)).sort((a, b) => +b - +a)[0] ?? null,
    };
    const scopeKey = assignment.subjectId ?? "ALL";
    await tx.teacherAnalytics.upsert({
      where: { teacherId_academicYearId_scopeKey: { teacherId: assignment.teacherId, academicYearId: input.academicYearId, scopeKey } },
      update: data,
      create: { ...data, teacherId: assignment.teacherId, academicYearId: input.academicYearId, subjectId: assignment.subjectId, scopeKey },
    });
  }

  const currentSchools = await tx.schoolAnalytics.findMany({ where: { publisherId: input.publisherId, academicYear: { current: true, active: true } } });
  const [publisherSubjects, publisherChapters, publisherSkills, publisherTimeline] = await Promise.all([
    tx.studentSubjectAnalytics.findMany({ where: { publisherId: input.publisherId, academicYear: { current: true, active: true } } }),
    tx.studentChapterAnalytics.findMany({ where: { publisherId: input.publisherId, academicYear: { current: true, active: true } } }),
    tx.studentSkillAnalytics.findMany({ where: { publisherId: input.publisherId, academicYear: { current: true, active: true } } }),
    tx.learningTimeline.findMany({ where: { publisherId: input.publisherId, academicYear: { current: true, active: true } } }),
  ]);
  const [publisherSchoolCount, publisherActiveYears, publisherStudentCount, publisherActiveStudents, publisherTeacherCount] = await Promise.all([
    tx.school.count({ where: { publisherId: input.publisherId } }),
    tx.academicYear.findMany({ where: { school: { publisherId: input.publisherId }, current: true, active: true }, distinct: ["schoolId"], select: { schoolId: true } }),
    tx.student.count({ where: { school: { publisherId: input.publisherId } } }),
    tx.studentEnrollment.count({ where: { school: { publisherId: input.publisherId }, academicYear: { current: true, active: true }, status: "ACTIVE" } }),
    tx.teacher.count({ where: { school: { publisherId: input.publisherId }, active: true } }),
  ]);
  const publisherData = {
    totalSchools: publisherSchoolCount,
    activeSchools: publisherActiveYears.length,
    totalStudents: publisherStudentCount,
    activeStudents: publisherActiveStudents,
    participatingStudents: currentSchools.reduce((sum, row) => sum + row.participatingStudents, 0),
    totalTeachers: publisherTeacherCount,
    averageReading: average(currentSchools.map((row) => row.averageReading)),
    averageRevision: average(currentSchools.map((row) => row.averageRevision)),
    averagePractice: average(currentSchools.map((row) => row.averagePractice)),
    averageAssessment: average(currentSchools.map((row) => row.averageAssessment)),
    aiSessions: currentSchools.reduce((sum, row) => sum + row.aiSessions, 0),
    aiRequests: currentSchools.reduce((sum, row) => sum + row.aiRequests, 0),
    subjectPerformance: rankedFacts(publisherSubjects.map((row) => ({ key: row.subjectId, value: row.completionPercent }))),
    bookPerformance: rankedFacts(publisherChapters.map((row) => ({ key: row.bookId, value: row.completionPercent }))),
    chapterPerformance: rankedFacts(publisherChapters.map((row) => ({ key: row.chapterId, value: row.averageAssessment ?? row.averagePractice ?? row.completionPercent }))),
    assessmentPerformance: rankedFacts(publisherTimeline.filter((row) => row.activityType === LearningActivityType.ASSESSMENT).map((row) => ({ key: row.sourceId, value: row.scorePercent }))),
    skillPerformance: rankedFacts(publisherSkills.map((row) => ({ key: `${row.dimension}:${row.skillLabel ?? row.skillKey}`, value: row.averagePercent }))),
    aiModeUsage: countedFacts(publisherTimeline.filter((row) => row.activityType === LearningActivityType.STUDENT_AI).map((row) => row.aiIntent)),
    lastActivityAt: currentSchools.map((row) => row.lastActivityAt).filter((date): date is Date => Boolean(date)).sort((a, b) => +b - +a)[0] ?? null,
  };
  await tx.publisherAnalytics.upsert({ where: { publisherId_scopeKey: { publisherId: input.publisherId, scopeKey: "ALL" } }, update: publisherData, create: { ...publisherData, publisherId: input.publisherId, scopeKey: "ALL" } });
}

export async function recordLearningActivity(tx: Tx, input: LearningActivityInput) {
  const context = await tx.student.findFirst({ where: { id: input.studentId, schoolId: input.schoolId, school: { publisherId: input.publisherId }, enrollments: { some: { academicYearId: input.academicYearId, schoolId: input.schoolId } } }, select: { id: true } });
  if (!context) throw new Error("Analytics context does not match the student's tenant and academic year.");
  const book = input.bookId ? await tx.book.findFirst({ where: { id: input.bookId, publisherId: input.publisherId }, select: { id: true, subjectId: true } }) : null;
  if (input.bookId && !book) throw new Error("Analytics book is outside the publisher tenant.");
  if (input.chapterId && !await tx.bookChapter.findFirst({ where: { id: input.chapterId, ...(input.bookId ? { bookId: input.bookId } : {}) }, select: { id: true } })) throw new Error("Analytics chapter does not match the book.");
  const data = { ...input, subjectId: input.subjectId ?? book?.subjectId ?? null, bookId: input.bookId ?? null, chapterId: input.chapterId ?? null, completed: input.completed ?? false, provisional: input.provisional ?? false, scorePercent: input.scorePercent ?? null, progressValue: input.progressValue ?? null, totalValue: input.totalValue ?? null, durationSeconds: input.durationSeconds ?? null, aiIntent: input.aiIntent ?? null };
  await tx.learningTimeline.upsert({ where: { eventKey: input.eventKey }, update: data, create: data });
  await refreshStudent(tx, input);
  await refreshSkillAnalytics(tx, input);
  await refreshRoleAnalytics(tx, input);
}
