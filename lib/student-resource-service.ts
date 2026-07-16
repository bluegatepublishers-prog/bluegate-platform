export interface StudentResourceScope {
  sectionSubjectId: string;
  resources: ReadonlyArray<{ id: string }>;
}

export interface StudentResourceResolution<TResource> {
  decision: { allowed: boolean };
  resource?: TResource;
}

export async function authorizeStudentResourceFromSubjects<TResource>(
  input: {
    resourceId: string;
    userId: string;
    academicYearId: string;
    sectionId: string;
    subjects: readonly StudentResourceScope[];
  },
  authorize: (
    user: { id: string; role: "STUDENT" },
    request: {
      resourceId: string;
      academicYearId: string;
      sectionId: string;
      sectionSubjectId: string;
    },
  ) => Promise<StudentResourceResolution<TResource>>,
) {
  const subject = input.subjects.find((item) =>
    item.resources.some((resource) => resource.id === input.resourceId),
  );
  if (!subject) return null;
  const resolution = await authorize(
    { id: input.userId, role: "STUDENT" },
    {
      resourceId: input.resourceId,
      academicYearId: input.academicYearId,
      sectionId: input.sectionId,
      sectionSubjectId: subject.sectionSubjectId,
    },
  );
  return resolution.decision.allowed && resolution.resource
    ? resolution.resource
    : null;
}
