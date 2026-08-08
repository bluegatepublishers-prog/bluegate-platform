import "server-only";

import {
  AttendanceCorrectionDecision,
  AttendanceLockBehavior,
  AttendanceMode,
  AttendanceSessionType,
  AttendanceStatus,
  PlatformFeatureKey,
  SecurityAuditOutcome,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getPlatformFeatureAvailability } from "@/lib/publisher-features";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import { requireSchool } from "@/lib/school-dashboard";
import { isSchoolFeatureEnabled } from "@/lib/school-feature-entitlements";
import { requireTeacher } from "@/lib/teacher-dashboard";
import { requireTeacherClass } from "@/lib/classroom";
import { requireStudent } from "@/lib/student-dashboard";
import { requireParentChildAccess } from "@/lib/parent-dashboard";
import { getMentorStudentScope } from "@/lib/mentor-dashboard";
import { requirePublisherAdmin } from "@/lib/publisher-context";
import {
  accountAuditActor,
  publisherAdminAuditActor,
  writeSecurityAuditEvent,
} from "@/lib/security-audit";
import { effectiveSchoolAccessStatus } from "@/lib/school-access-policy";

const DEFAULT_ATTENDANCE_POLICY = {
  attendanceMode: AttendanceMode.DAILY,
  lockBehavior: AttendanceLockBehavior.MANUAL,
  lockHour: 18,
  correctionWindowDays: 7,
  minimumAttendancePercentage: 75,
  lateThresholdMinutes: 10,
  halfDayThresholdMinutes: 180,
  allowTeacherDraftSaving: true,
  requireRemarkAbsent: true,
  requireRemarkLate: false,
  requireRemarkHalfDay: false,
  requireRemarkExcused: true,
  workingDays: [1, 2, 3, 4, 5],
  excludeHolidays: true,
} as const;

export const ATTENDANCE_STATUS_OPTIONS = Object.values(AttendanceStatus);
export const ATTENDANCE_SESSION_TYPE_OPTIONS = Object.values(AttendanceSessionType);

type AttendanceRecordInput = {
  enrollmentId: string;
  status: AttendanceStatus;
  remark?: string;
  checkInTime?: string;
};

export type TeacherAttendanceAccessState =
  | { status: "READY"; teacherId: string; teacherUserId: string; schoolId: string; publisherId: string; academicYearId: string; attendanceMode: AttendanceMode; policy: Awaited<ReturnType<typeof getSchoolAttendancePolicyBySchoolId>>; assignmentCount: number }
  | { status: "NO_ASSIGNMENTS"; teacherId: string; teacherUserId: string; schoolId: string; publisherId: string; academicYearId: string; attendanceMode: AttendanceMode; policy: Awaited<ReturnType<typeof getSchoolAttendancePolicyBySchoolId>>; assignmentCount: number }
  | { status: "FEATURE_DISABLED"; message: string }
  | { status: "SUBSCRIPTION_BLOCKED"; message: string }
  | { status: "NO_ACADEMIC_YEAR"; message: string };

function resolveAssignedSectionSubjectId(
  scope: Awaited<ReturnType<typeof requireTeacherClass>>,
  sectionSubjectId?: string,
) {
  const candidateId = sectionSubjectId?.trim();
  const subject = candidateId
    ? scope.sectionSubjects.find((item) => item.id === candidateId)
    : scope.sectionSubjects[0];
  if (!subject) throw new Error("This subject is not assigned to you.");
  return subject.id;
}

function dayBounds(input: Date) {
  const start = new Date(input);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function parseDateInput(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

function lockCutoff(input: Date, lockHour: number) {
  const cutoff = new Date(input);
  cutoff.setHours(lockHour, 0, 0, 0);
  return cutoff;
}

function canTeacherEdit(sessionDate: Date, locked: boolean, lockHour: number) {
  if (locked) return false;
  const now = new Date();
  const { start: today } = dayBounds(now);
  const { start: target } = dayBounds(sessionDate);
  if (target.getTime() < today.getTime()) return false;
  return now < lockCutoff(sessionDate, lockHour);
}

function hasSubmittedOrLockedScope() {
  return {
    OR: [{ locked: true }, { submittedAt: { not: null } }],
  };
}

function requiresRemarkForStatus(
  status: AttendanceStatus,
  policy: Awaited<ReturnType<typeof getSchoolAttendancePolicyBySchoolId>>,
) {
  if (status === AttendanceStatus.ABSENT) return policy.requireRemarkAbsent;
  if (status === AttendanceStatus.LATE) return policy.requireRemarkLate;
  if (status === AttendanceStatus.HALF_DAY) return policy.requireRemarkHalfDay;
  if (status === AttendanceStatus.EXCUSED) return policy.requireRemarkExcused;
  return false;
}

async function getSchoolAttendancePolicyBySchoolId(schoolId: string) {
  const policy = await prisma.schoolAttendancePolicy.upsert({
    where: { schoolId },
    update: {},
    create: {
      schoolId,
      ...DEFAULT_ATTENDANCE_POLICY,
      workingDays: [...DEFAULT_ATTENDANCE_POLICY.workingDays],
    },
  });
  return policy;
}

export async function getSchoolAttendancePolicy() {
  await requireSchoolFeature("ATTENDANCE");
  const school = await requireSchool();
  return getSchoolAttendancePolicyBySchoolId(school.id);
}

function statusWeight(status: AttendanceStatus) {
  if (status === AttendanceStatus.ABSENT) return 0;
  if (status === AttendanceStatus.HALF_DAY) return 0.5;
  return 1;
}

function mergeDayStatuses(statuses: AttendanceStatus[]) {
  if (!statuses.length) return null;
  if (statuses.includes(AttendanceStatus.ABSENT)) return AttendanceStatus.ABSENT;
  if (statuses.includes(AttendanceStatus.ON_LEAVE)) return AttendanceStatus.ON_LEAVE;
  if (statuses.includes(AttendanceStatus.HALF_DAY)) return AttendanceStatus.HALF_DAY;
  if (statuses.includes(AttendanceStatus.LATE)) return AttendanceStatus.LATE;
  if (statuses.includes(AttendanceStatus.EXCUSED)) return AttendanceStatus.EXCUSED;
  return AttendanceStatus.PRESENT;
}

async function currentAcademicYearId(schoolId: string) {
  const year = await prisma.academicYear.findFirst({
    where: { schoolId, active: true, current: true },
    select: { id: true },
  });
  return year?.id ?? null;
}

export async function getTeacherAttendanceAccessState() {
  const teacher = await requireTeacher();
  if (!teacher.schoolId || !teacher.school?.publisherId) {
    return { status: "SUBSCRIPTION_BLOCKED", message: "Teacher attendance is not configured for this school." } as const;
  }

  const [platformAvailability, subscription, academicYearId, assignmentCount, policy] = await Promise.all([
    getPlatformFeatureAvailability(),
    prisma.schoolAccessSubscription.findUnique({
      where: { schoolId: teacher.schoolId },
      select: {
        publisherId: true,
        featureConfig: true,
        plan: true,
        status: true,
        startsAt: true,
        expiresAt: true,
      },
    }),
    currentAcademicYearId(teacher.schoolId),
    prisma.teacherAssignment.count({
      where: {
        teacherId: teacher.id,
        schoolId: teacher.schoolId,
        active: true,
        academicYear: { active: true, current: true, schoolId: teacher.schoolId },
        schoolClass: { active: true, schoolId: teacher.schoolId },
        section: { active: true },
      },
    }),
    getSchoolAttendancePolicyBySchoolId(teacher.schoolId),
  ]);

  if (!platformAvailability[PlatformFeatureKey.ATTENDANCE]) {
    return { status: "FEATURE_DISABLED", message: "Attendance is unavailable at the platform level." } as const;
  }
  if (!subscription || subscription.publisherId !== teacher.school.publisherId) {
    return { status: "SUBSCRIPTION_BLOCKED", message: "Attendance is not enabled for this school." } as const;
  }
  if (effectiveSchoolAccessStatus(subscription) !== "ACTIVE") {
    return { status: "SUBSCRIPTION_BLOCKED", message: "School access is inactive." } as const;
  }
  if (!isSchoolFeatureEnabled(subscription, "ATTENDANCE")) {
    return { status: "FEATURE_DISABLED", message: "This feature has been disabled by your publisher." } as const;
  }
  if (!academicYearId) {
    return { status: "NO_ACADEMIC_YEAR", message: "Current academic year is not configured." } as const;
  }
  if (!assignmentCount) {
    return {
      status: "NO_ASSIGNMENTS",
      teacherId: teacher.id,
      teacherUserId: teacher.userId,
      schoolId: teacher.schoolId,
      publisherId: teacher.school.publisherId,
      academicYearId,
      attendanceMode: policy.attendanceMode,
      policy,
      assignmentCount,
    } as const;
  }

  return {
    status: "READY",
    teacherId: teacher.id,
    teacherUserId: teacher.userId,
    schoolId: teacher.schoolId,
    publisherId: teacher.school.publisherId,
    academicYearId,
    attendanceMode: policy.attendanceMode,
    policy,
    assignmentCount,
  } as const;
}

async function findOrCreateTeacherSession(input: {
  schoolId: string;
  teacherId: string;
  academicYearId: string;
  classSectionId: string;
  sectionSubjectId?: string;
  date: Date;
  period?: string;
  sessionType: AttendanceSessionType;
}) {
  const { start, end } = dayBounds(input.date);
  const existing = await prisma.attendanceSession.findFirst({
    where: {
      schoolId: input.schoolId,
      academicYearId: input.academicYearId,
      classSectionId: input.classSectionId,
      sectionSubjectId: input.sectionSubjectId ?? null,
      teacherId: input.teacherId,
      sessionType: input.sessionType,
      period: input.period?.trim() || null,
      date: { gte: start, lt: end },
    },
    include: { records: true },
  });
  if (existing) return existing;

  return prisma.attendanceSession.create({
    data: {
      schoolId: input.schoolId,
      academicYearId: input.academicYearId,
      classSectionId: input.classSectionId,
      sectionSubjectId: input.sectionSubjectId ?? null,
      teacherId: input.teacherId,
      date: start,
      period: input.period?.trim() || null,
      sessionType: input.sessionType,
      submittedAt: null,
      submittedBy: null,
      locked: false,
    },
    include: { records: true },
  });
}

export async function getTeacherAttendanceWorkspace(input: {
  sectionId: string;
  date?: string;
  sessionType?: string;
  period?: string;
  sectionSubjectId?: string;
}) {
  const access = await getTeacherAttendanceAccessState();
  if (access.status === "FEATURE_DISABLED" || access.status === "SUBSCRIPTION_BLOCKED" || access.status === "NO_ACADEMIC_YEAR") {
    throw new Error(access.message);
  }
  const scope = await requireTeacherClass(input.sectionId);
  const teacher = await requireTeacher();
  const policy = await getSchoolAttendancePolicyBySchoolId(scope.schoolId);
  if (scope.teacher.id !== teacher.id) throw new Error("Unauthorized attendance scope.");
  const sectionSubjectId = resolveAssignedSectionSubjectId(scope, input.sectionSubjectId);

  const date = parseDateInput(input.date);
  const sessionType = ATTENDANCE_SESSION_TYPE_OPTIONS.includes(input.sessionType as AttendanceSessionType)
    ? (input.sessionType as AttendanceSessionType)
    : AttendanceSessionType.DAILY;

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolId: scope.schoolId,
      academicYearId: scope.academicYear.id,
      sectionId: scope.section.id,
      status: "ACTIVE",
      student: { active: true },
    },
    include: { student: { select: { id: true, name: true } } },
    orderBy: [{ rollNumber: "asc" }, { student: { name: "asc" } }],
  });

  const session = await findOrCreateTeacherSession({
    schoolId: scope.schoolId,
    teacherId: scope.teacher.id,
    academicYearId: scope.academicYear.id,
    classSectionId: scope.section.id,
    sectionSubjectId,
    date,
    period: input.period,
    sessionType,
  });

  const recordByEnrollment = new Map(
    session.records.map((record) => [record.studentEnrollmentId, record]),
  );

  const roster = enrollments.map((enrollment) => {
    const record = recordByEnrollment.get(enrollment.id);
    return {
      attendanceRecordId: record?.id ?? null,
      studentId: enrollment.student.id,
      enrollmentId: enrollment.id,
      rollNumber: enrollment.rollNumber,
      studentName: enrollment.student.name,
      status: record?.attendanceStatus ?? AttendanceStatus.PRESENT,
      leaveLocked: record?.attendanceStatus === AttendanceStatus.ON_LEAVE,
      remark: record?.remark ?? "",
      checkInTime: record?.checkInTime
        ? `${String(record.checkInTime.getHours()).padStart(2, "0")}:${String(record.checkInTime.getMinutes()).padStart(2, "0")}`
        : "",
    };
  });

  return {
    scope,
    session,
    roster,
    editable: canTeacherEdit(session.date, session.locked, policy.lockHour),
    lockHour: policy.lockHour,
    policy,
  };
}

async function writeTeacherAttendance(input: {
  sectionId: string;
  date?: string;
  sessionType?: string;
  period?: string;
  sectionSubjectId?: string;
  records: AttendanceRecordInput[];
  submit: boolean;
}) {
  const scope = await requireTeacherClass(input.sectionId);
  const policy = await getSchoolAttendancePolicyBySchoolId(scope.schoolId);
  const date = parseDateInput(input.date);
  const sectionSubjectId = resolveAssignedSectionSubjectId(scope, input.sectionSubjectId);
  const sessionType = ATTENDANCE_SESSION_TYPE_OPTIONS.includes(input.sessionType as AttendanceSessionType)
    ? (input.sessionType as AttendanceSessionType)
    : AttendanceSessionType.DAILY;

  const validEnrollmentIds = new Set(
    (
      await prisma.studentEnrollment.findMany({
        where: {
          schoolId: scope.schoolId,
          academicYearId: scope.academicYear.id,
          sectionId: scope.section.id,
          status: "ACTIVE",
          student: { active: true },
        },
        select: { id: true },
      })
    ).map((item) => item.id),
  );

  const duplicateScan = new Set<string>();
  for (const record of input.records) {
    if (duplicateScan.has(record.enrollmentId)) {
      throw new Error("Duplicate attendance entries for the same student are not allowed.");
    }
    duplicateScan.add(record.enrollmentId);
  }

  const records = input.records.filter((record) => validEnrollmentIds.has(record.enrollmentId));
  if (!records.length) throw new Error("No valid attendance records were provided.");
  if (records.length !== validEnrollmentIds.size) {
    throw new Error("Attendance status is required for every student in the section.");
  }

  for (const record of records) {
    if (!ATTENDANCE_STATUS_OPTIONS.includes(record.status)) {
      throw new Error("Invalid attendance status received.");
    }
  }

  const session = await findOrCreateTeacherSession({
    schoolId: scope.schoolId,
    teacherId: scope.teacher.id,
    academicYearId: scope.academicYear.id,
    classSectionId: scope.section.id,
    sectionSubjectId,
    date,
    period: input.period,
    sessionType,
  });

  if (!canTeacherEdit(session.date, session.locked, policy.lockHour)) {
    throw new Error("Attendance is locked for this session date.");
  }

  if (!policy.allowTeacherDraftSaving && !input.submit) {
    throw new Error("Draft saving is disabled by school attendance policy.");
  }

  const leaveProtectedEnrollments = new Set(
    session.records
      .filter((record) => record.attendanceStatus === AttendanceStatus.ON_LEAVE)
      .map((record) => record.studentEnrollmentId),
  );
  for (const record of records) {
    if (
      leaveProtectedEnrollments.has(record.enrollmentId) &&
      record.status !== AttendanceStatus.ON_LEAVE
    ) {
      throw new Error("Approved leave cannot be overwritten. Request a correction instead.");
    }

    if (requiresRemarkForStatus(record.status, policy) && !(record.remark ?? "").trim()) {
      throw new Error(`Remark is required when marking status as ${record.status}.`);
    }
  }

  const shouldLock = input.submit && policy.lockBehavior === AttendanceLockBehavior.AUTO_AFTER_SUBMISSION;

  await prisma.$transaction(async (tx) => {
    for (const record of records) {
      const checkIn = record.checkInTime?.trim()
        ? new Date(`${session.date.toISOString().slice(0, 10)}T${record.checkInTime.trim()}:00`)
        : null;

      await tx.attendanceRecord.upsert({
        where: {
          attendanceSessionId_studentEnrollmentId: {
            attendanceSessionId: session.id,
            studentEnrollmentId: record.enrollmentId,
          },
        },
        update: {
          attendanceStatus: record.status,
          remark: record.remark?.trim() || null,
          checkInTime: checkIn,
          updatedBy: scope.teacher.userId,
        },
        create: {
          attendanceSessionId: session.id,
          studentEnrollmentId: record.enrollmentId,
          attendanceStatus: record.status,
          remark: record.remark?.trim() || null,
          checkInTime: checkIn,
          markedBy: scope.teacher.userId,
          updatedBy: scope.teacher.userId,
        },
      });
    }

    await tx.attendanceSession.update({
      where: { id: session.id },
      data: {
        locked: shouldLock,
        submittedAt: input.submit ? new Date() : null,
        submittedBy: input.submit ? scope.teacher.userId : null,
      },
    });

    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: scope.teacher.userId, role: UserRole.TEACHER, publisherId: scope.publisherId }),
      action: input.submit ? "teacher.attendance.submit" : "teacher.attendance.save_draft",
      targetType: "AttendanceSession",
      targetId: session.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: {
        scope: input.submit ? "submit" : "draft",
        toStatus: shouldLock ? "LOCKED" : input.submit ? "SUBMITTED" : "DRAFT",
      },
    });
  });

  return { sessionId: session.id };
}

export async function saveTeacherAttendanceDraft(input: {
  sectionId: string;
  date?: string;
  sessionType?: string;
  period?: string;
  sectionSubjectId?: string;
  records: AttendanceRecordInput[];
}) {
  return writeTeacherAttendance({ ...input, submit: false });
}

export async function submitTeacherAttendance(input: {
  sectionId: string;
  date?: string;
  sessionType?: string;
  period?: string;
  sectionSubjectId?: string;
  records: AttendanceRecordInput[];
}) {
  return writeTeacherAttendance({ ...input, submit: true });
}

export async function requestAttendanceCorrection(input: {
  sectionId: string;
  attendanceRecordId: string;
  newStatus: AttendanceStatus;
  reason: string;
}) {
  const scope = await requireTeacherClass(input.sectionId);
  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 500) {
    throw new Error("A correction reason between 5 and 500 characters is required.");
  }

  const record = await prisma.attendanceRecord.findFirst({
    where: {
      id: input.attendanceRecordId,
      attendanceSession: {
        classSectionId: scope.section.id,
        schoolId: scope.schoolId,
        academicYearId: scope.academicYear.id,
      },
    },
    include: { attendanceSession: true },
  });

  if (!record || !record.attendanceSession.locked) {
    throw new Error("Corrections are allowed only for locked attendance sessions.");
  }

  if (record.attendanceStatus === input.newStatus) {
    throw new Error("New status must be different from the current attendance status.");
  }

  await prisma.$transaction(async (tx) => {
    const correction = await tx.attendanceCorrection.create({
      data: {
        attendanceRecordId: record.id,
        previousStatus: record.attendanceStatus,
        newStatus: input.newStatus,
        reason,
        createdBy: scope.teacher.userId,
      },
    });

    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: scope.teacher.userId, role: UserRole.TEACHER, publisherId: scope.publisherId }),
      action: "teacher.attendance.correction.request",
      targetType: "AttendanceCorrection",
      targetId: correction.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { fromStatus: record.attendanceStatus, toStatus: input.newStatus },
    });
  });
}

type SchoolAttendanceDashboardInput = {
  date?: string;
  sessionType?: AttendanceSessionType;
  schoolClassId?: string;
  sectionId?: string;
  teacherId?: string;
  subjectId?: string;
};

function dateKey(input: Date) {
  return input.toISOString().slice(0, 10);
}

function sessionCompletionStatus(session: { locked: boolean; submittedAt: Date | null; records: Array<{ id: string }> }) {
  if (session.locked) return "LOCKED" as const;
  if (session.submittedAt) return "SUBMITTED" as const;
  if (session.records.length) return "DRAFT" as const;
  return "NOT_STARTED" as const;
}

function inWorkingDays(dayOfWeek: number, workingDays: number[]) {
  const normalized = dayOfWeek === 0 ? 7 : dayOfWeek;
  return workingDays.includes(normalized);
}

export async function getSchoolAttendanceDashboard(input: SchoolAttendanceDashboardInput = {}) {
  await requireSchoolFeature("ATTENDANCE");
  const school = await requireSchool();
  const date = parseDateInput(input.date);
  const { start, end } = dayBounds(date);
  const academicYearId = await currentAcademicYearId(school.id);
  const policy = await getSchoolAttendancePolicyBySchoolId(school.id);
  if (!academicYearId) {
    return {
      date: start,
      policy,
      kpis: {
        totalStudents: 0,
        presentToday: 0,
        absentToday: 0,
        lateToday: 0,
        attendancePercentage: 0,
        sessionsSubmitted: 0,
        sessionsPending: 0,
        pendingCorrections: 0,
      },
      todaysSummary: { present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0, excused: 0, total: 0 },
      classSubmissionStatus: [],
      pendingCorrections: [],
      lowAttendanceStudents: [],
      recentActivity: [],
      teacherCompletion: [],
      empty: true,
    };
  }

  const sessionType = input.sessionType
    ?? (policy.attendanceMode === AttendanceMode.PERIOD ? AttendanceSessionType.PERIOD : AttendanceSessionType.DAILY);

  const [assignments, totalStudents, sessions, pendingCorrections, yearlyRecords, activity] = await Promise.all([
    prisma.teacherAssignment.findMany({
      where: {
        schoolId: school.id,
        academicYearId,
        active: true,
        sectionId: input.sectionId,
        schoolClassId: input.schoolClassId,
        teacherId: input.teacherId,
        subjectId: input.subjectId,
      },
      include: {
        teacher: { include: { user: { select: { name: true } } } },
        schoolClass: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: [{ schoolClass: { sortOrder: "asc" } }, { section: { name: "asc" } }, { teacher: { user: { name: "asc" } } }],
    }),
    prisma.studentEnrollment.count({
      where: {
        schoolId: school.id,
        academicYearId,
        status: "ACTIVE",
        sectionId: input.sectionId,
        schoolClassId: input.schoolClassId,
      },
    }),
    prisma.attendanceSession.findMany({
      where: {
        schoolId: school.id,
        academicYearId,
        date: { gte: start, lt: end },
        classSectionId: input.sectionId,
        teacherId: input.teacherId,
        sessionType,
      },
      include: {
        classSection: { include: { schoolClass: { select: { name: true } } } },
        sectionSubject: { include: { subject: { select: { id: true, name: true } } } },
        teacher: { include: { user: { select: { name: true } } } },
        records: {
          include: {
            studentEnrollment: {
              include: {
                student: { select: { id: true, name: true } },
                schoolClass: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ classSection: { schoolClass: { sortOrder: "asc" } } }, { classSection: { name: "asc" } }],
    }),
    prisma.attendanceCorrection.findMany({
      where: {
        decisionStatus: AttendanceCorrectionDecision.PENDING,
        attendanceRecord: {
          attendanceSession: { schoolId: school.id, academicYearId },
        },
      },
      include: {
        attendanceRecord: {
          include: {
            attendanceSession: {
              include: {
                classSection: { include: { schoolClass: { select: { name: true } } } },
                teacher: { include: { user: { select: { name: true } } } },
              },
            },
            studentEnrollment: {
              include: {
                student: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.attendanceRecord.findMany({
      where: {
        attendanceSession: {
          schoolId: school.id,
          academicYearId,
          ...hasSubmittedOrLockedScope(),
        },
      },
      select: {
        attendanceStatus: true,
        studentEnrollmentId: true,
        attendanceSession: { select: { date: true } },
        studentEnrollment: {
          select: {
            student: { select: { name: true } },
            schoolClass: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
    }),
    prisma.securityAuditEvent.findMany({
      where: {
        actorRole: UserRole.SCHOOL,
        action: { in: ["teacher.attendance.submit", "school.attendance.session.lock", "school.attendance.correction.approve", "school.attendance.correction.reject"] },
        publisherId: school.publisherId,
      },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, action: true, createdAt: true, targetType: true },
    }),
  ]);

  const sectionSubjectLinks = await prisma.sectionSubject.findMany({
    where: {
      active: true,
      sectionId: { in: [...new Set(assignments.map((row) => row.sectionId))] },
      subjectId: { in: [...new Set(assignments.map((row) => row.subjectId).filter((value): value is string => Boolean(value)))] },
    },
    select: { id: true, sectionId: true, subjectId: true },
  });
  const sectionSubjectMap = new Map(sectionSubjectLinks.map((row) => [`${row.sectionId}:${row.subjectId}`, row.id]));

  const sessionMap = new Map(
    sessions.map((session) => [
      `${session.classSectionId}:${session.sectionSubjectId ?? ""}:${session.sessionType}:${session.period ?? ""}`,
      session,
    ]),
  );

  const classSubmissionStatus = assignments.map((assignment) => {
    const sectionSubjectId = assignment.subjectId ? sectionSubjectMap.get(`${assignment.sectionId}:${assignment.subjectId}`) ?? null : null;
    const key = `${assignment.sectionId}:${sectionSubjectId ?? ""}:${sessionType}:`;
    const session = sessionMap.get(key) ?? null;
    const status = session
      ? sessionCompletionStatus(session)
      : "NOT_STARTED" as const;

    return {
      assignmentId: assignment.id,
      schoolClass: assignment.schoolClass.name,
      section: assignment.section.name,
      subject: assignment.subject?.name ?? null,
      teacher: assignment.teacher.user.name,
      sessionType,
      status,
      submittedAt: session?.submittedAt ?? null,
      period: session?.period ?? null,
      sessionId: session?.id ?? null,
    };
  });

  const todayRecords = sessions
    .filter((session) => session.submittedAt || session.locked)
    .flatMap((session) => session.records);
  const todaysSummary = {
    present: todayRecords.filter((record) => record.attendanceStatus === AttendanceStatus.PRESENT).length,
    absent: todayRecords.filter((record) => record.attendanceStatus === AttendanceStatus.ABSENT).length,
    late: todayRecords.filter((record) => record.attendanceStatus === AttendanceStatus.LATE).length,
    halfDay: todayRecords.filter((record) => record.attendanceStatus === AttendanceStatus.HALF_DAY).length,
    onLeave: todayRecords.filter((record) => record.attendanceStatus === AttendanceStatus.ON_LEAVE).length,
    excused: todayRecords.filter((record) => record.attendanceStatus === AttendanceStatus.EXCUSED).length,
    total: todayRecords.length,
  };

  const weightedToday = todayRecords.reduce((sum, row) => sum + statusWeight(row.attendanceStatus), 0);
  const attendancePercentage = todaysSummary.total
    ? Number(((weightedToday / todaysSummary.total) * 100).toFixed(1))
    : 0;

  const byStudent = new Map<string, Array<{ status: AttendanceStatus; date: string; name: string; className: string; sectionName: string }>>();
  for (const row of yearlyRecords) {
    const key = row.studentEnrollmentId;
    const list = byStudent.get(key) ?? [];
    list.push({
      status: row.attendanceStatus,
      date: dateKey(row.attendanceSession.date),
      name: row.studentEnrollment.student.name,
      className: row.studentEnrollment.schoolClass.name,
      sectionName: row.studentEnrollment.section.name,
    });
    byStudent.set(key, list);
  }

  const lowAttendanceStudents = [...byStudent.values()]
    .map((entries) => {
      const merged = aggregateAttendanceRows(entries.map((entry) => ({ status: entry.status, dateKey: entry.date })));
      const pct = merged.percentage;
      const status = pct < policy.minimumAttendancePercentage
        ? "Below Minimum"
        : pct < policy.minimumAttendancePercentage + 10
          ? "Warning"
          : "On Track";
      return {
        student: entries[0]?.name ?? "Student",
        classSection: `${entries[0]?.className ?? "Class"}-${entries[0]?.sectionName ?? "Section"}`,
        attendancePercentage: pct,
        absentDays: merged.totals.absent,
        lateDays: merged.totals.late,
        status,
      };
    })
    .sort((a, b) => a.attendancePercentage - b.attendancePercentage)
    .slice(0, 25);

  const teacherCompletion = await getSchoolTeacherCompletion({
    dateFrom: dateKey(start),
    dateTo: dateKey(start),
    sessionType,
    schoolClassId: input.schoolClassId,
    sectionId: input.sectionId,
    teacherId: input.teacherId,
    subjectId: input.subjectId,
  });

  await prisma.$transaction(async (tx) => {
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
      action: "school.attendance.dashboard.view",
      targetType: "School",
      targetId: school.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "daily" },
    });
  });

  return {
    date: start,
    policy,
    kpis: {
      totalStudents,
      presentToday: todaysSummary.present,
      absentToday: todaysSummary.absent,
      lateToday: todaysSummary.late,
      attendancePercentage,
      sessionsSubmitted: classSubmissionStatus.filter((item) => item.status === "SUBMITTED" || item.status === "LOCKED").length,
      sessionsPending: classSubmissionStatus.filter((item) => item.status === "NOT_STARTED" || item.status === "DRAFT").length,
      pendingCorrections: pendingCorrections.length,
    },
    todaysSummary,
    classSubmissionStatus,
    pendingCorrections,
    lowAttendanceStudents,
    recentActivity: activity,
    teacherCompletion,
    empty: classSubmissionStatus.length === 0,
  };
}

export async function getSchoolAttendanceSessionDetail(sessionId: string) {
  await requireSchoolFeature("ATTENDANCE");
  const school = await requireSchool();
  const academicYearId = await currentAcademicYearId(school.id);
  if (!academicYearId) throw new Error("Current academic year is not configured.");

  const session = await prisma.attendanceSession.findFirst({
    where: {
      id: sessionId,
      schoolId: school.id,
      academicYearId,
    },
    include: {
      classSection: { include: { schoolClass: { select: { name: true } } } },
      sectionSubject: { include: { subject: { select: { name: true } } } },
      teacher: { include: { user: { select: { name: true } } } },
      records: {
        include: {
          studentEnrollment: { include: { student: { select: { name: true } } } },
          corrections: { orderBy: { createdAt: "desc" } },
        },
        orderBy: [{ studentEnrollment: { rollNumber: "asc" } }, { studentEnrollment: { student: { name: "asc" } } }],
      },
    },
  });
  if (!session) throw new Error("Attendance session was not found.");

  const userIds = [...new Set(session.records.flatMap((row) => [row.markedBy, row.updatedBy]))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const userMap = new Map(users.map((row) => [row.id, row.name]));

  return {
    session,
    status: sessionCompletionStatus(session),
    rows: session.records.map((row) => ({
      id: row.id,
      student: row.studentEnrollment.student.name,
      rollNumber: row.studentEnrollment.rollNumber,
      status: row.attendanceStatus,
      remark: row.remark,
      markedBy: userMap.get(row.markedBy) ?? row.markedBy,
      updatedBy: userMap.get(row.updatedBy) ?? row.updatedBy,
      submittedAt: session.submittedAt,
      corrections: row.corrections,
    })),
  };
}

export async function lockSchoolAttendanceSession(sessionId: string) {
  await requireSchoolFeature("ATTENDANCE");
  const school = await requireSchool();
  const academicYearId = await currentAcademicYearId(school.id);
  if (!academicYearId) throw new Error("Current academic year is not configured.");

  await prisma.$transaction(async (tx) => {
    const session = await tx.attendanceSession.findFirst({
      where: { id: sessionId, schoolId: school.id, academicYearId },
      select: { id: true, submittedAt: true, locked: true },
    });
    if (!session) throw new Error("Attendance session was not found.");
    if (!session.submittedAt) throw new Error("Draft sessions cannot be locked.");
    if (session.locked) return;

    await tx.attendanceSession.update({ where: { id: session.id }, data: { locked: true } });
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
      action: "school.attendance.session.lock",
      targetType: "AttendanceSession",
      targetId: session.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { toStatus: "LOCKED" },
    });
  });
}

export async function bulkLockSchoolAttendanceByDate(input: { date: string }) {
  await requireSchoolFeature("ATTENDANCE");
  const school = await requireSchool();
  const academicYearId = await currentAcademicYearId(school.id);
  if (!academicYearId) throw new Error("Current academic year is not configured.");
  const date = parseDateInput(input.date);
  const { start, end } = dayBounds(date);

  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.attendanceSession.findMany({
      where: {
        schoolId: school.id,
        academicYearId,
        date: { gte: start, lt: end },
        locked: false,
        submittedAt: { not: null },
      },
      select: { id: true },
    });
    if (!rows.length) return 0;

    await tx.attendanceSession.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: { locked: true },
    });
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
      action: "school.attendance.session.lock_bulk_date",
      targetType: "AttendanceSession",
      targetId: null,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "date" },
    });
    return rows.length;
  });

  return { lockedCount: result };
}

export async function reviewAttendanceCorrection(input: {
  correctionId: string;
  decision: "APPROVE" | "REJECT";
  decisionNote?: string;
}) {
  const school = await requireSchool();
  await requireSchoolFeature("ATTENDANCE");
  const policy = await getSchoolAttendancePolicyBySchoolId(school.id);
  const note = input.decisionNote?.trim() || null;

  await prisma.$transaction(async (tx) => {
    const correction = await tx.attendanceCorrection.findFirst({
      where: {
        id: input.correctionId,
        decisionStatus: AttendanceCorrectionDecision.PENDING,
        attendanceRecord: {
          attendanceSession: { schoolId: school.id },
        },
      },
      include: { attendanceRecord: { include: { attendanceSession: true } } },
    });
    if (!correction) throw new Error("Correction request was not found or has already been reviewed.");

    const ageInDays = (Date.now() - correction.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > policy.correctionWindowDays) {
      throw new Error("Correction request is outside the configured review window.");
    }

    if (input.decision === "APPROVE") {
      await tx.attendanceRecord.update({
        where: { id: correction.attendanceRecordId },
        data: {
          attendanceStatus: correction.newStatus,
          updatedBy: school.userId,
        },
      });
      await tx.attendanceCorrection.update({
        where: { id: correction.id },
        data: {
          decisionStatus: AttendanceCorrectionDecision.APPROVED,
          approvedBy: school.userId,
          reviewedBy: school.userId,
          reviewedAt: new Date(),
          decisionNote: note,
        },
      });
      await writeSecurityAuditEvent(tx, {
        actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
        action: "school.attendance.correction.approve",
        targetType: "AttendanceCorrection",
        targetId: correction.id,
        outcome: SecurityAuditOutcome.SUCCESS,
        metadata: { fromStatus: correction.previousStatus, toStatus: correction.newStatus },
      });
      return;
    }

    await tx.attendanceCorrection.update({
      where: { id: correction.id },
      data: {
        decisionStatus: AttendanceCorrectionDecision.REJECTED,
        reviewedBy: school.userId,
        reviewedAt: new Date(),
        decisionNote: note,
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
      action: "school.attendance.correction.reject",
      targetType: "AttendanceCorrection",
      targetId: correction.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { fromStatus: correction.previousStatus, toStatus: correction.previousStatus },
    });
  });
}

export async function approveAttendanceCorrection(correctionId: string) {
  return reviewAttendanceCorrection({ correctionId, decision: "APPROVE" });
}

export async function rejectAttendanceCorrection(correctionId: string, decisionNote?: string) {
  return reviewAttendanceCorrection({ correctionId, decision: "REJECT", decisionNote });
}

export async function getSchoolTeacherCompletion(input: {
  dateFrom?: string;
  dateTo?: string;
  academicYearId?: string;
  schoolClassId?: string;
  sectionId?: string;
  teacherId?: string;
  subjectId?: string;
  sessionType?: AttendanceSessionType;
}) {
  const school = await requireSchool();
  await requireSchoolFeature("ATTENDANCE");
  const policy = await getSchoolAttendancePolicyBySchoolId(school.id);
  const currentYearId = await currentAcademicYearId(school.id);
  const academicYearId = input.academicYearId ?? currentYearId;
  if (!academicYearId) return [];

  const startDate = parseDateInput(input.dateFrom);
  const endDate = parseDateInput(input.dateTo);
  const from = dayBounds(startDate).start;
  const to = dayBounds(endDate).end;
  const sessionType = input.sessionType
    ?? (policy.attendanceMode === AttendanceMode.PERIOD ? AttendanceSessionType.PERIOD : AttendanceSessionType.DAILY);

  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      schoolId: school.id,
      academicYearId,
      active: true,
      schoolClassId: input.schoolClassId,
      sectionId: input.sectionId,
      teacherId: input.teacherId,
      subjectId: input.subjectId,
    },
    include: {
      teacher: { include: { user: { select: { name: true } } } },
      schoolClass: { select: { name: true } },
      section: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });

  const sectionSubjects = await prisma.sectionSubject.findMany({
    where: {
      active: true,
      sectionId: { in: [...new Set(assignments.map((row) => row.sectionId))] },
      subjectId: { in: [...new Set(assignments.map((row) => row.subjectId).filter((value): value is string => Boolean(value)))] },
    },
    select: { id: true, sectionId: true, subjectId: true },
  });
  const sectionSubjectMap = new Map(sectionSubjects.map((row) => [`${row.sectionId}:${row.subjectId}`, row.id]));

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      schoolId: school.id,
      academicYearId,
      date: { gte: from, lt: to },
      sessionType,
      ...hasSubmittedOrLockedScope(),
    },
    select: {
      id: true,
      classSectionId: true,
      teacherId: true,
      sectionSubjectId: true,
      submittedAt: true,
      date: true,
    },
  });

  let workingDaysCount = 0;
  for (const d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
    if (inWorkingDays(d.getDay(), policy.workingDays)) workingDaysCount += 1;
  }
  if (workingDaysCount === 0) workingDaysCount = 1;

  return assignments.map((assignment) => {
    const sectionSubjectId = assignment.subjectId
      ? sectionSubjectMap.get(`${assignment.sectionId}:${assignment.subjectId}`) ?? null
      : null;
    const relevant = sessions.filter((session) => session.teacherId === assignment.teacherId && session.classSectionId === assignment.sectionId && session.sectionSubjectId === sectionSubjectId);
    const expectedSessions = workingDaysCount;
    const submittedSessions = relevant.length;
    const pendingSessions = Math.max(0, expectedSessions - submittedSessions);
    const lateSubmissions = relevant.filter((session) => {
      if (!session.submittedAt) return false;
      return session.submittedAt.getTime() > lockCutoff(session.date, policy.lockHour).getTime();
    }).length;
    const completionPercentage = expectedSessions
      ? Number(((submittedSessions / expectedSessions) * 100).toFixed(1))
      : 0;

    return {
      teacher: assignment.teacher.user.name,
      schoolClass: assignment.schoolClass.name,
      section: assignment.section.name,
      subject: assignment.subject?.name ?? null,
      expectedSessions,
      submittedSessions,
      pendingSessions,
      lateSubmissions,
      completionPercentage,
    };
  });
}

type AttendanceReportPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "ACADEMIC_YEAR";

function periodBounds(period: AttendanceReportPeriod, date: Date, academicYear?: { startDate: Date; endDate: Date }) {
  if (period === "DAILY") return dayBounds(date);

  if (period === "WEEKLY") {
    const start = new Date(date);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  if (period === "MONTHLY") {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return { start, end };
  }

  if (academicYear) {
    const start = new Date(academicYear.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(academicYear.endDate);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  }

  return dayBounds(date);
}

function aggregateAttendanceRows(rows: Array<{ status: AttendanceStatus; dateKey: string }>) {
  const byDay = new Map<string, AttendanceStatus[]>();
  for (const row of rows) {
    const list = byDay.get(row.dateKey) ?? [];
    list.push(row.status);
    byDay.set(row.dateKey, list);
  }

  const mergedStatuses = [...byDay.values()].map((statuses) => mergeDayStatuses(statuses)).filter((value): value is AttendanceStatus => Boolean(value));
  const totals = {
    present: mergedStatuses.filter((status) => status === AttendanceStatus.PRESENT).length,
    absent: mergedStatuses.filter((status) => status === AttendanceStatus.ABSENT).length,
    late: mergedStatuses.filter((status) => status === AttendanceStatus.LATE).length,
    excused: mergedStatuses.filter((status) => status === AttendanceStatus.EXCUSED).length,
    halfDay: mergedStatuses.filter((status) => status === AttendanceStatus.HALF_DAY).length,
    onLeave: mergedStatuses.filter((status) => status === AttendanceStatus.ON_LEAVE).length,
    total: mergedStatuses.length,
  };

  const weighted = mergedStatuses.reduce((sum, status) => sum + statusWeight(status), 0);
  const percentage = totals.total ? Number(((weighted / totals.total) * 100).toFixed(1)) : 0;
  return { totals, percentage };
}

export async function getSchoolAttendanceReport(input: {
  period: AttendanceReportPeriod;
  date?: Date;
}) {
  const school = await requireSchool();
  await requireSchoolFeature("ATTENDANCE");
  const policy = await getSchoolAttendancePolicyBySchoolId(school.id);
  const date = input.date ?? new Date();
  const year = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, active: true, current: true },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!year) return null;

  const bounds = periodBounds(input.period, date, year);
  const records = await prisma.attendanceRecord.findMany({
    where: {
      attendanceSession: {
        schoolId: school.id,
        academicYearId: year.id,
        date: { gte: bounds.start, lt: bounds.end },
        ...hasSubmittedOrLockedScope(),
      },
    },
    select: {
      attendanceStatus: true,
      studentEnrollmentId: true,
      attendanceSession: {
        select: {
          date: true,
          classSectionId: true,
          teacherId: true,
          classSection: {
            select: {
              name: true,
              schoolClass: { select: { name: true } },
            },
          },
          teacher: { select: { user: { select: { name: true } } } },
        },
      },
      studentEnrollment: {
        select: {
          student: { select: { name: true } },
        },
      },
    },
  });

  const statusRows = records.map((record) => ({
    status: record.attendanceStatus,
    dateKey: record.attendanceSession.date.toISOString().slice(0, 10),
  }));
  const totals = aggregateAttendanceRows(statusRows);

  const byStudent = new Map<string, Array<{ status: AttendanceStatus; dateKey: string; name: string }>>();
  for (const record of records) {
    const list = byStudent.get(record.studentEnrollmentId) ?? [];
    list.push({
      status: record.attendanceStatus,
      dateKey: record.attendanceSession.date.toISOString().slice(0, 10),
      name: record.studentEnrollment.student.name,
    });
    byStudent.set(record.studentEnrollmentId, list);
  }

  const studentSummaries = [...byStudent.entries()].map(([, entries]) => {
    const merged = aggregateAttendanceRows(entries.map((item) => ({ status: item.status, dateKey: item.dateKey })));
    return {
      name: entries[0]?.name ?? "Student",
      percentage: merged.percentage,
      absentDays: merged.totals.absent,
      lateDays: merged.totals.late,
    };
  }).sort((a, b) => a.percentage - b.percentage);

  const lowAttendance = studentSummaries.filter((row) => row.percentage < policy.minimumAttendancePercentage).slice(0, 20);

  const sessionRows = await prisma.attendanceSession.findMany({
    where: {
      schoolId: school.id,
      academicYearId: year.id,
      date: { gte: bounds.start, lt: bounds.end },
      ...hasSubmittedOrLockedScope(),
    },
    select: {
      id: true,
      date: true,
      teacherId: true,
      classSectionId: true,
      classSection: { select: { name: true, schoolClass: { select: { name: true } } } },
      teacher: { select: { user: { select: { name: true } } } },
      records: { select: { id: true, attendanceStatus: true } },
    },
  });

  const teacherCompletion = new Map<string, { teacherName: string; sessions: number; records: number }>();
  const sectionCompletion = new Map<string, { sectionName: string; percentage: number }>();

  for (const session of sessionRows) {
    const key = session.teacherId;
    const teacher = teacherCompletion.get(key) ?? {
      teacherName: session.teacher.user.name,
      sessions: 0,
      records: 0,
    };
    teacher.sessions += 1;
    teacher.records += session.records.length;
    teacherCompletion.set(key, teacher);

    const sectionKey = session.classSectionId;
    const total = session.records.length;
    const presentLike = session.records.filter((item) => item.attendanceStatus !== AttendanceStatus.ABSENT).length;
    const pct = total ? Number(((presentLike / total) * 100).toFixed(1)) : 0;
    sectionCompletion.set(sectionKey, {
      sectionName: `${session.classSection.schoolClass.name}-${session.classSection.name}`,
      percentage: pct,
    });
  }

  await prisma.$transaction(async (tx) => {
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
      action: "school.attendance.report.read",
      targetType: "School",
      targetId: school.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: input.period },
    });
  });

  return {
    period: input.period,
    start: bounds.start,
    end: bounds.end,
    totals,
    lowAttendance,
    lateArrivals: totals.totals.late,
    teacherCompletion: [...teacherCompletion.values()],
    sectionCompletion: [...sectionCompletion.values()],
  };
}

export async function updateSchoolAttendancePolicy(input: {
  attendanceMode: AttendanceMode;
  lockBehavior: AttendanceLockBehavior;
  lockHour: number;
  correctionWindowDays: number;
  minimumAttendancePercentage: number;
  lateThresholdMinutes: number;
  halfDayThresholdMinutes: number;
  allowTeacherDraftSaving: boolean;
  requireRemarkAbsent: boolean;
  requireRemarkLate: boolean;
  requireRemarkHalfDay: boolean;
  requireRemarkExcused: boolean;
  workingDays: number[];
  excludeHolidays: boolean;
}) {
  const school = await requireSchool();
  await requireSchoolFeature("ATTENDANCE");

  if (input.minimumAttendancePercentage < 0 || input.minimumAttendancePercentage > 100) {
    throw new Error("Minimum attendance percentage must be between 0 and 100.");
  }
  if (input.lockHour < 0 || input.lockHour > 23) throw new Error("Lock hour must be between 0 and 23.");
  if (input.correctionWindowDays < 1 || input.correctionWindowDays > 60) {
    throw new Error("Correction request window must be between 1 and 60 days.");
  }
  if (input.lateThresholdMinutes < 1 || input.lateThresholdMinutes > 240) {
    throw new Error("Late threshold must be between 1 and 240 minutes.");
  }
  if (input.halfDayThresholdMinutes < 30 || input.halfDayThresholdMinutes > 480) {
    throw new Error("Half-day threshold must be between 30 and 480 minutes.");
  }
  const workingDays = [...new Set(input.workingDays)].filter((day) => day >= 1 && day <= 7).sort();
  if (!workingDays.length) throw new Error("At least one working day is required.");

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.schoolAttendancePolicy.upsert({
      where: { schoolId: school.id },
      update: {
        attendanceMode: input.attendanceMode,
        lockBehavior: input.lockBehavior,
        lockHour: input.lockHour,
        correctionWindowDays: input.correctionWindowDays,
        minimumAttendancePercentage: input.minimumAttendancePercentage,
        lateThresholdMinutes: input.lateThresholdMinutes,
        halfDayThresholdMinutes: input.halfDayThresholdMinutes,
        allowTeacherDraftSaving: input.allowTeacherDraftSaving,
        requireRemarkAbsent: input.requireRemarkAbsent,
        requireRemarkLate: input.requireRemarkLate,
        requireRemarkHalfDay: input.requireRemarkHalfDay,
        requireRemarkExcused: input.requireRemarkExcused,
        workingDays,
        excludeHolidays: input.excludeHolidays,
      },
      create: {
        schoolId: school.id,
        attendanceMode: input.attendanceMode,
        lockBehavior: input.lockBehavior,
        lockHour: input.lockHour,
        correctionWindowDays: input.correctionWindowDays,
        minimumAttendancePercentage: input.minimumAttendancePercentage,
        lateThresholdMinutes: input.lateThresholdMinutes,
        halfDayThresholdMinutes: input.halfDayThresholdMinutes,
        allowTeacherDraftSaving: input.allowTeacherDraftSaving,
        requireRemarkAbsent: input.requireRemarkAbsent,
        requireRemarkLate: input.requireRemarkLate,
        requireRemarkHalfDay: input.requireRemarkHalfDay,
        requireRemarkExcused: input.requireRemarkExcused,
        workingDays,
        excludeHolidays: input.excludeHolidays,
      },
    });
    await writeSecurityAuditEvent(tx, {
      actor: accountAuditActor({ id: school.userId, role: UserRole.SCHOOL, publisherId: school.publisherId }),
      action: "school.attendance.policy.update",
      targetType: "School",
      targetId: school.id,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: "attendance_policy" },
    });
    return row;
  });

  return updated;
}

export async function getSchoolAttendanceReportSuite(input?: { date?: string; studentId?: string }) {
  const school = await requireSchool();
  const date = parseDateInput(input?.date);
  const [daily, weekly, monthly, academicYear, teacherCompletion, corrections] = await Promise.all([
    getSchoolAttendanceReport({ period: "DAILY", date }),
    getSchoolAttendanceReport({ period: "WEEKLY", date }),
    getSchoolAttendanceReport({ period: "MONTHLY", date }),
    getSchoolAttendanceReport({ period: "ACADEMIC_YEAR", date }),
    getSchoolTeacherCompletion({ dateFrom: dateKey(dayBounds(date).start), dateTo: dateKey(dayBounds(date).start) }),
    prisma.attendanceCorrection.findMany({
      where: {
        attendanceRecord: { attendanceSession: { schoolId: school.id } },
      },
      include: {
        attendanceRecord: {
          include: {
            attendanceSession: {
              include: {
                classSection: { include: { schoolClass: { select: { name: true } } } },
              },
            },
            studentEnrollment: { include: { student: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const studentHistory = input?.studentId
    ? await prisma.attendanceRecord.findMany({
      where: {
        studentEnrollment: { studentId: input.studentId, schoolId: school.id },
        attendanceSession: hasSubmittedOrLockedScope(),
      },
      include: {
        attendanceSession: { include: { classSection: { include: { schoolClass: { select: { name: true } } } } } },
      },
      orderBy: [{ attendanceSession: { date: "desc" } }],
      take: 100,
    })
    : [];

  return {
    daily,
    weekly,
    monthly,
    academicYear,
    teacherCompletion,
    corrections,
    studentHistory,
    lowAttendance: monthly?.lowAttendance ?? [],
    chronicAbsence: (academicYear?.lowAttendance ?? []).filter((row) => row.absentDays >= 10),
    lateArrival: (monthly?.lowAttendance ?? []).sort((a, b) => b.lateDays - a.lateDays),
  };
}

type StudentAttendanceHistoryStatusFilter = AttendanceStatus | "ALL";
type StudentAttendanceHistorySessionTypeFilter = AttendanceSessionType | "ALL";

function monthBounds(monthKey?: string) {
  if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
    const [year, month] = monthKey.split("-").map((value) => Number(value));
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return { start, end, monthKey };
  }
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end, monthKey: start.toISOString().slice(0, 7) };
}

function normalizeHistoryStatusFilter(value?: string): StudentAttendanceHistoryStatusFilter {
  if (!value || value === "ALL") return "ALL";
  return ATTENDANCE_STATUS_OPTIONS.includes(value as AttendanceStatus)
    ? (value as AttendanceStatus)
    : "ALL";
}

function normalizeHistorySessionTypeFilter(value?: string): StudentAttendanceHistorySessionTypeFilter {
  if (!value || value === "ALL") return "ALL";
  return ATTENDANCE_SESSION_TYPE_OPTIONS.includes(value as AttendanceSessionType)
    ? (value as AttendanceSessionType)
    : "ALL";
}

function friendlyAttendanceStatus(status: AttendanceStatus | "NOT_SUBMITTED" | "HOLIDAY" | "NO_ATTENDANCE" | "MIXED") {
  const map = {
    PRESENT: "Present",
    ABSENT: "Absent",
    LATE: "Late",
    HALF_DAY: "Half Day",
    ON_LEAVE: "On Leave",
    EXCUSED: "Excused",
    NOT_SUBMITTED: "Not Submitted",
    HOLIDAY: "Holiday",
    NO_ATTENDANCE: "No attendance submitted",
    MIXED: "Mixed",
  } as const;
  return map[status];
}

function studentVisibleRemark(status: AttendanceStatus, remark: string | null) {
  if (!remark) return null;
  if (status === AttendanceStatus.ON_LEAVE || status === AttendanceStatus.EXCUSED) {
    return remark;
  }
  return null;
}

function summaryStatusForDay(statuses: AttendanceStatus[]) {
  if (!statuses.length) return "NOT_SUBMITTED" as const;
  if (statuses.every((item) => item === AttendanceStatus.PRESENT)) return AttendanceStatus.PRESENT;
  if (statuses.includes(AttendanceStatus.ABSENT)) {
    return statuses.every((item) => item === AttendanceStatus.ABSENT)
      ? AttendanceStatus.ABSENT
      : "MIXED" as const;
  }
  if (statuses.every((item) => item === AttendanceStatus.LATE)) return AttendanceStatus.LATE;
  if (statuses.includes(AttendanceStatus.HALF_DAY)) return AttendanceStatus.HALF_DAY;
  if (statuses.includes(AttendanceStatus.ON_LEAVE)) return AttendanceStatus.ON_LEAVE;
  if (statuses.includes(AttendanceStatus.EXCUSED)) return AttendanceStatus.EXCUSED;
  return "MIXED" as const;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
}

function buildCalendarDays(input: {
  monthStart: Date;
  monthEnd: Date;
  today: Date;
  holidays: Set<string>;
  dailyMap: Map<string, { statuses: AttendanceStatus[]; sessionType: AttendanceSessionType; periods: Array<{ period: string | null; subject: string | null; status: AttendanceStatus; time: string | null; remark: string | null; }> }>;
  workingDays: number[];
}) {
  const rows: Array<{
    date: string;
    day: number;
    weekday: number;
    inFuture: boolean;
    isHoliday: boolean;
    isWorkingDay: boolean;
    status: AttendanceStatus | "NOT_SUBMITTED" | "HOLIDAY" | "NO_ATTENDANCE" | "MIXED";
    statusLabel: string;
    sessionType: AttendanceSessionType | null;
    periods: Array<{ period: string | null; subject: string | null; status: AttendanceStatus; statusLabel: string; time: string | null; remark: string | null }>;
  }> = [];

  const end = new Date(input.monthEnd);
  end.setUTCDate(end.getUTCDate() - 1);
  const todayKey = dateKey(input.today);

  for (let d = new Date(input.monthStart); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const weekdayRaw = d.getUTCDay();
    const weekday = weekdayRaw === 0 ? 7 : weekdayRaw;
    const isWorkingDay = input.workingDays.includes(weekday);
    const isHoliday = input.holidays.has(key);
    const inFuture = key > todayKey;
    const daily = input.dailyMap.get(key);

    let status: AttendanceStatus | "NOT_SUBMITTED" | "HOLIDAY" | "NO_ATTENDANCE" | "MIXED";
    if (inFuture) status = "NO_ATTENDANCE";
    else if (isHoliday) status = "HOLIDAY";
    else if (!daily) status = isWorkingDay ? "NOT_SUBMITTED" : "NO_ATTENDANCE";
    else status = summaryStatusForDay(daily.statuses);

    rows.push({
      date: key,
      day: d.getUTCDate(),
      weekday,
      inFuture,
      isHoliday,
      isWorkingDay,
      status,
      statusLabel: friendlyAttendanceStatus(status),
      sessionType: daily?.sessionType ?? null,
      periods: (daily?.periods ?? []).map((row) => ({
        ...row,
        statusLabel: friendlyAttendanceStatus(row.status),
      })),
    });
  }

  return rows;
}

function requirementStatus(minimum: number, current: number) {
  const delta = Number((current - minimum).toFixed(1));
  if (current >= minimum + 15) {
    return {
      label: "Excellent",
      message: "Your attendance is excellent. Keep it up.",
      delta,
    };
  }
  if (current >= minimum + 5) {
    return {
      label: "On Track",
      message: "You are comfortably above your school requirement.",
      delta,
    };
  }
  if (current >= minimum) {
    return {
      label: "Close to Minimum",
      message: `You are meeting the school requirement of ${minimum}%. Aim a little higher this month.`,
      delta,
    };
  }
  return {
    label: "Below Minimum",
    message: `Attendance is currently below the school's ${minimum}% requirement. Please contact the school office for guidance.`,
    delta,
  };
}

async function getEnrollmentAttendanceExperience(input: {
  schoolId: string;
  academicYearId: string;
  sectionId: string;
  enrollmentId: string;
  studentName: string;
  classSection: string;
  academicYearName: string;
  schoolName?: string;
  month?: string;
  status?: string;
  sessionType?: string;
  subject?: string;
  page?: number;
}) {
  const policy = await getSchoolAttendancePolicyBySchoolId(input.schoolId);
  const now = new Date();

  const academicYearWindow = await prisma.academicYear.findUnique({
    where: { id: input.academicYearId },
    select: { startDate: true, endDate: true },
  });
  if (!academicYearWindow) throw new Error("Academic year not found for attendance.");

  const enrollmentWindow = await prisma.studentEnrollment.findUnique({
    where: { id: input.enrollmentId },
    select: { joinedAt: true, leftAt: true },
  });
  if (!enrollmentWindow) throw new Error("Enrollment not found for attendance.");

  const historyStatus = normalizeHistoryStatusFilter(input.status);
  const historySessionType = normalizeHistorySessionTypeFilter(input.sessionType);
  const month = monthBounds(input.month);

  const academicStart = dayBounds(academicYearWindow.startDate).start;
  const academicEndExclusive = dayBounds(academicYearWindow.endDate).end;
  const enrollmentStart = dayBounds(enrollmentWindow.joinedAt).start;
  const enrollmentEndExclusive = enrollmentWindow.leftAt ? dayBounds(enrollmentWindow.leftAt).end : academicEndExclusive;

  const rangeStart = new Date(Math.max(month.start.getTime(), academicStart.getTime(), enrollmentStart.getTime()));
  const rangeEnd = new Date(Math.min(month.end.getTime(), academicEndExclusive.getTime(), enrollmentEndExclusive.getTime(), dayBounds(now).end.getTime()));

  if (rangeStart >= rangeEnd) {
    return {
      monthKey: month.monthKey,
      studentName: input.studentName,
      classSection: input.classSection,
      schoolName: input.schoolName ?? null,
      academicYear: input.academicYearName,
      policy,
      summary: { percentage: 0, present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0, excused: 0, total: 0 },
      today: { date: dateKey(now), label: friendlyAttendanceStatus("NOT_SUBMITTED"), status: "NOT_SUBMITTED", sessionType: policy.attendanceMode === AttendanceMode.PERIOD ? AttendanceSessionType.PERIOD : AttendanceSessionType.DAILY, periods: [], remark: null, submitted: false },
      calendar: [],
      trend: [],
      requirement: requirementStatus(policy.minimumAttendancePercentage, 0),
      history: { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0, filters: { status: historyStatus, sessionType: historySessionType, subject: input.subject?.trim() || "ALL" } },
      subjects: [],
      empty: true,
    };
  }

  const holidayRows = await prisma.academicPlannerItem.findMany({
    where: {
      schoolId: input.schoolId,
      academicYearId: input.academicYearId,
      type: "HOLIDAY",
      status: { not: "CANCELLED" },
      currentDate: { gte: rangeStart, lt: rangeEnd },
      OR: [{ sectionId: null }, { sectionId: input.sectionId }],
    },
    select: { currentDate: true },
  });
  const holidays = new Set(holidayRows.map((row) => dateKey(row.currentDate)));

  const sessionWhere = {
    schoolId: input.schoolId,
    academicYearId: input.academicYearId,
    classSectionId: input.sectionId,
    date: { gte: rangeStart, lt: rangeEnd },
    ...hasSubmittedOrLockedScope(),
  };

  const attendanceRows = await prisma.attendanceRecord.findMany({
    where: {
      studentEnrollmentId: input.enrollmentId,
      attendanceSession: {
        ...sessionWhere,
        sessionType: historySessionType === "ALL" ? undefined : historySessionType,
        sectionSubject: input.subject?.trim() && input.subject !== "ALL"
          ? { subject: { name: input.subject.trim() } }
          : undefined,
      },
      attendanceStatus: historyStatus === "ALL" ? undefined : historyStatus,
    },
    select: {
      attendanceStatus: true,
      remark: true,
      attendanceSession: {
        select: {
          date: true,
          sessionType: true,
          period: true,
          sectionSubject: { select: { subject: { select: { name: true } } } },
          teacher: { select: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: [{ attendanceSession: { date: "desc" } }, { attendanceSession: { period: "asc" } }],
  });

  const subjects = [...new Set(attendanceRows.map((row) => row.attendanceSession.sectionSubject?.subject.name).filter((value): value is string => Boolean(value)))].sort();

  const dailyMap = new Map<string, {
    statuses: AttendanceStatus[];
    sessionType: AttendanceSessionType;
    periods: Array<{ period: string | null; subject: string | null; status: AttendanceStatus; time: string | null; remark: string | null }>;
  }>();
  for (const row of attendanceRows) {
    const key = dateKey(row.attendanceSession.date);
    const existing = dailyMap.get(key) ?? {
      statuses: [],
      sessionType: row.attendanceSession.sessionType,
      periods: [],
    };
    existing.statuses.push(row.attendanceStatus);
    existing.periods.push({
      period: row.attendanceSession.period,
      subject: row.attendanceSession.sectionSubject?.subject.name ?? null,
      status: row.attendanceStatus,
      time: row.attendanceSession.period,
      remark: studentVisibleRemark(row.attendanceStatus, row.remark),
    });
    dailyMap.set(key, existing);
  }

  const eligibleDailyRows = [...dailyMap.entries()]
    .filter(([day]) => !holidays.has(day))
    .filter(([day]) => inWorkingDays(new Date(`${day}T00:00:00.000Z`).getUTCDay(), policy.workingDays))
    .map(([day, details]) => ({
      date: day,
      status: summaryStatusForDay(details.statuses),
      sessionType: details.sessionType,
      periods: details.periods,
    }));

  const summaryStatuses = eligibleDailyRows
    .filter((row) => ATTENDANCE_STATUS_OPTIONS.includes(row.status as AttendanceStatus))
    .map((row) => row.status as AttendanceStatus);

  const summary = {
    present: summaryStatuses.filter((row) => row === AttendanceStatus.PRESENT).length,
    absent: summaryStatuses.filter((row) => row === AttendanceStatus.ABSENT).length,
    late: summaryStatuses.filter((row) => row === AttendanceStatus.LATE).length,
    halfDay: summaryStatuses.filter((row) => row === AttendanceStatus.HALF_DAY).length,
    onLeave: summaryStatuses.filter((row) => row === AttendanceStatus.ON_LEAVE).length,
    excused: summaryStatuses.filter((row) => row === AttendanceStatus.EXCUSED).length,
    total: summaryStatuses.length,
    percentage: summaryStatuses.length
      ? Number(((summaryStatuses.reduce((sum, row) => sum + statusWeight(row), 0) / summaryStatuses.length) * 100).toFixed(1))
      : 0,
  };

  const todayKey = dateKey(now);
  const todayDaily = dailyMap.get(todayKey);
  const todayStatus = holidays.has(todayKey)
    ? "HOLIDAY"
    : todayDaily
      ? summaryStatusForDay(todayDaily.statuses)
      : "NOT_SUBMITTED";

  const calendar = buildCalendarDays({
    monthStart: month.start,
    monthEnd: month.end,
    today: now,
    holidays,
    dailyMap,
    workingDays: policy.workingDays,
  });

  const trendStart = new Date(Math.max(academicStart.getTime(), enrollmentStart.getTime()));
  const trendEnd = new Date(Math.min(academicEndExclusive.getTime(), enrollmentEndExclusive.getTime(), dayBounds(now).end.getTime()));
  const trendRows: Array<{ monthKey: string; label: string; percentage: number; present: number; absent: number; late: number }> = [];

  for (
    let cursor = new Date(Date.UTC(trendStart.getUTCFullYear(), trendStart.getUTCMonth(), 1));
    cursor < trendEnd;
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  ) {
    const cursorEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const monthFrom = new Date(Math.max(cursor.getTime(), trendStart.getTime()));
    const monthTo = new Date(Math.min(cursorEnd.getTime(), trendEnd.getTime()));
    const monthKeyValue = cursor.toISOString().slice(0, 7);

    const rows = await prisma.attendanceRecord.findMany({
      where: {
        studentEnrollmentId: input.enrollmentId,
        attendanceSession: {
          ...sessionWhere,
          date: { gte: monthFrom, lt: monthTo },
        },
      },
      select: {
        attendanceStatus: true,
        attendanceSession: { select: { date: true } },
      },
    });

    const byDay = new Map<string, AttendanceStatus[]>();
    for (const row of rows) {
      const key = dateKey(row.attendanceSession.date);
      if (holidays.has(key)) continue;
      if (!inWorkingDays(new Date(`${key}T00:00:00.000Z`).getUTCDay(), policy.workingDays)) continue;
      const list = byDay.get(key) ?? [];
      list.push(row.attendanceStatus);
      byDay.set(key, list);
    }

    const merged = [...byDay.entries()].map(([day, statuses]) => ({ date: day, status: summaryStatusForDay(statuses) }))
      .filter((row) => ATTENDANCE_STATUS_OPTIONS.includes(row.status as AttendanceStatus))
      .map((row) => row.status as AttendanceStatus);
    const percentage = merged.length
      ? Number(((merged.reduce((sum, row) => sum + statusWeight(row), 0) / merged.length) * 100).toFixed(1))
      : 0;

    trendRows.push({
      monthKey: monthKeyValue,
      label: monthLabel(cursor),
      percentage,
      present: merged.filter((row) => row === AttendanceStatus.PRESENT).length,
      absent: merged.filter((row) => row === AttendanceStatus.ABSENT).length,
      late: merged.filter((row) => row === AttendanceStatus.LATE).length,
    });
  }

  const pageSize = 20;
  const currentPage = Math.max(1, Math.floor(input.page ?? 1));
  const historyTotal = attendanceRows.length;
  const totalPages = Math.ceil(historyTotal / pageSize);
  const historySlice = attendanceRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const requirement = requirementStatus(policy.minimumAttendancePercentage, summary.percentage);

  return {
    monthKey: month.monthKey,
    studentName: input.studentName,
    classSection: input.classSection,
    schoolName: input.schoolName ?? null,
    academicYear: input.academicYearName,
    policy,
    summary,
    today: {
      date: todayKey,
      label: friendlyAttendanceStatus(todayStatus),
      status: todayStatus,
      sessionType: todayDaily?.sessionType ?? (policy.attendanceMode === AttendanceMode.PERIOD ? AttendanceSessionType.PERIOD : AttendanceSessionType.DAILY),
      periods: (todayDaily?.periods ?? []).map((row) => ({ ...row, statusLabel: friendlyAttendanceStatus(row.status) })),
      remark: todayDaily?.periods.find((row) => row.remark)?.remark ?? null,
      submitted: Boolean(todayDaily),
    },
    calendar,
    trend: trendRows,
    requirement,
    history: {
      items: historySlice.map((row) => ({
        date: dateKey(row.attendanceSession.date),
        sessionType: row.attendanceSession.sessionType,
        period: row.attendanceSession.period,
        subject: row.attendanceSession.sectionSubject?.subject.name ?? null,
        teacher: row.attendanceSession.teacher.user.name,
        status: row.attendanceStatus,
        statusLabel: friendlyAttendanceStatus(row.attendanceStatus),
        remark: studentVisibleRemark(row.attendanceStatus, row.remark),
      })),
      page: currentPage,
      pageSize,
      total: historyTotal,
      totalPages,
      filters: {
        status: historyStatus,
        sessionType: historySessionType,
        subject: input.subject?.trim() || "ALL",
      },
    },
    subjects,
    empty: summary.total === 0,
  };
}

export async function getStudentAttendanceExperience(input?: {
  month?: string;
  status?: string;
  sessionType?: string;
  subject?: string;
  page?: number;
}) {
  const identity = await requireStudent();
  return getEnrollmentAttendanceExperience({
    schoolId: identity.school.id,
    academicYearId: identity.enrollment.academicYearId,
    sectionId: identity.enrollment.sectionId,
    enrollmentId: identity.enrollment.id,
    studentName: identity.student.name,
    classSection: `${identity.enrollment.schoolClass.name}-${identity.enrollment.section.name}`,
    academicYearName: identity.academicYear.name,
    month: input?.month,
    status: input?.status,
    sessionType: input?.sessionType,
    subject: input?.subject,
    page: input?.page,
  });
}

export async function getParentChildAttendanceExperience(input: {
  studentId: string;
  month?: string;
  status?: string;
  sessionType?: string;
  subject?: string;
  page?: number;
}) {
  const scope = await requireParentChildAccess(input.studentId);
  return getEnrollmentAttendanceExperience({
    schoolId: scope.student.schoolId,
    academicYearId: scope.enrollment.academicYearId,
    sectionId: scope.enrollment.sectionId,
    enrollmentId: scope.enrollment.id,
    studentName: scope.student.name,
    classSection: `${scope.enrollment.schoolClass.name}-${scope.enrollment.section.name}`,
    academicYearName: scope.enrollment.academicYear.name,
    schoolName: scope.student.school.schoolName,
    month: input.month,
    status: input.status,
    sessionType: input.sessionType,
    subject: input.subject,
    page: input.page,
  });
}

async function getEnrollmentMonthlyAttendance(enrollmentId: string, month?: string) {
  const now = new Date();
  const monthDate = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1));
  const end = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1));

  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentEnrollmentId: enrollmentId,
      attendanceSession: { date: { gte: start, lt: end }, ...hasSubmittedOrLockedScope() },
    },
    select: {
      attendanceStatus: true,
      remark: true,
      attendanceSession: {
        select: { id: true, date: true, sessionType: true, period: true },
      },
    },
    orderBy: [{ attendanceSession: { date: "asc" } }],
  });

  const byDay = new Map<string, AttendanceStatus[]>();
  const timeline = records.map((record) => {
    const key = record.attendanceSession.date.toISOString().slice(0, 10);
    const rows = byDay.get(key) ?? [];
    rows.push(record.attendanceStatus);
    byDay.set(key, rows);

    return {
      date: key,
      status: record.attendanceStatus,
      sessionType: record.attendanceSession.sessionType,
      period: record.attendanceSession.period,
      remark: record.remark,
    };
  });

  const daily = [...byDay.entries()].map(([dateKey, statuses]) => ({
    date: dateKey,
    status: mergeDayStatuses(statuses) ?? AttendanceStatus.PRESENT,
  }));

  const monthly = aggregateAttendanceRows(
    daily.map((row) => ({ status: row.status, dateKey: row.date })),
  );

  return {
    monthKey: start.toISOString().slice(0, 7),
    daily,
    timeline,
    totals: monthly.totals,
    percentage: monthly.percentage,
    warning: monthly.percentage < 75 ? "Attendance is below the recommended 75% threshold." : null,
  };
}

export async function getStudentAttendanceMonthlyView(month?: string) {
  const identity = await requireStudent();
  return getEnrollmentMonthlyAttendance(identity.enrollment.id, month);
}

export async function getParentChildAttendanceMonthlyView(studentId: string, month?: string) {
  const scope = await requireParentChildAccess(studentId);
  return getEnrollmentMonthlyAttendance(scope.enrollment.id, month);
}

export async function getMentorStudentAttendanceIndicator(studentId: string, month?: string) {
  const scope = await getMentorStudentScope(studentId);
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId,
      schoolId: scope.assignment.schoolId,
      academicYearId: scope.assignment.academicYearId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!enrollment) throw new Error("Student enrollment is unavailable.");
  return getEnrollmentMonthlyAttendance(enrollment.id, month);
}

export async function getPublisherAttendanceReport(input: {
  period: AttendanceReportPeriod;
  date?: Date;
}) {
  const { user, publisher } = await requirePublisherAdmin();
  const date = input.date ?? new Date();
  const bounds = periodBounds(input.period, date);

  const [sessions, records] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: {
        school: { publisherId: publisher.id },
        date: { gte: bounds.start, lt: bounds.end },
        ...hasSubmittedOrLockedScope(),
      },
      select: { id: true, classSectionId: true, teacherId: true, schoolId: true, date: true },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        attendanceSession: {
          school: { publisherId: publisher.id },
          date: { gte: bounds.start, lt: bounds.end },
          ...hasSubmittedOrLockedScope(),
        },
      },
      select: {
        attendanceStatus: true,
        attendanceSession: { select: { date: true } },
      },
    }),
  ]);

  const totals = aggregateAttendanceRows(records.map((record) => ({
    status: record.attendanceStatus,
    dateKey: record.attendanceSession.date.toISOString().slice(0, 10),
  })));

  await prisma.$transaction(async (tx) => {
    await writeSecurityAuditEvent(tx, {
      actor: publisherAdminAuditActor({ userId: user.id, publisherId: publisher.id }),
      action: "publisher.attendance.report.read",
      targetType: "School",
      targetId: null,
      outcome: SecurityAuditOutcome.SUCCESS,
      metadata: { scope: input.period },
    });
  });

  return {
    period: input.period,
    start: bounds.start,
    end: bounds.end,
    sessions: sessions.length,
    totals,
  };
}
