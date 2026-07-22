export type AcademicCoverageInput = {
  sections: Array<{ id: string }>;
  sectionSubjects: Array<{ sectionId: string; subjectId: string }>;
  assignments: Array<{
    sectionId: string;
    subjectId: string | null;
    type: "CLASS_TEACHER" | "SUBJECT_TEACHER";
  }>;
};

const subjectKey = (sectionId: string, subjectId: string) => `${sectionId}:${subjectId}`;

export function buildAcademicCoverage(input: AcademicCoverageInput) {
  const sectionIds = new Set(input.sections.map((section) => section.id));
  const offeredSubjects = new Set(input.sectionSubjects.map((item) => item.subjectId));
  const expectedSubjects = new Set(
    input.sectionSubjects
      .filter((item) => sectionIds.has(item.sectionId))
      .map((item) => subjectKey(item.sectionId, item.subjectId)),
  );
  const classTeachers = new Set<string>();
  const subjectTeachers = new Set<string>();

  for (const assignment of input.assignments) {
    if (!sectionIds.has(assignment.sectionId)) continue;
    if (assignment.type === "CLASS_TEACHER") {
      classTeachers.add(assignment.sectionId);
    } else if (assignment.subjectId) {
      const key = subjectKey(assignment.sectionId, assignment.subjectId);
      if (expectedSubjects.has(key)) subjectTeachers.add(key);
    }
  }

  return {
    sections: sectionIds.size,
    offeredSubjects: offeredSubjects.size,
    sectionSubjects: expectedSubjects.size,
    classTeachers: classTeachers.size,
    subjectTeachers: subjectTeachers.size,
    activeAssignments: classTeachers.size + subjectTeachers.size,
    missingClassTeachers: Math.max(0, sectionIds.size - classTeachers.size),
    missingSubjectTeachers: Math.max(0, expectedSubjects.size - subjectTeachers.size),
  };
}

const profileFields = [
  ["schoolName", "School name"],
  ["principalName", "Principal name"],
  ["address", "Address"],
  ["city", "City"],
  ["state", "State"],
  ["pincode", "Pincode"],
  ["phone", "Phone"],
  ["email", "Email"],
] as const;

export function getSchoolProfileCompleteness(profile: Record<(typeof profileFields)[number][0], string | null | undefined>) {
  const missing = profileFields
    .filter(([key]) => !profile[key]?.trim())
    .map(([, label]) => label);
  const completed = profileFields.length - missing.length;
  return {
    completed,
    total: profileFields.length,
    percent: Math.round((completed / profileFields.length) * 100),
    missing,
    complete: missing.length === 0,
  };
}

export function normalizePositivePage(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number.parseInt(value || "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}
