export function summarizeTeacherAssignments(
  assignments: ReadonlyArray<{ sectionId: string; subjectId: string | null }>,
) {
  return {
    assignedClasses: new Set(assignments.map((assignment) => assignment.sectionId)).size,
    assignedSubjects: new Set(
      assignments.map((assignment) => assignment.subjectId).filter(
        (subjectId): subjectId is string => Boolean(subjectId),
      ),
    ).size,
  };
}