import type {
  Prisma,
  ResourceAudience,
  ResourceType,
} from "@prisma/client";

import {
  buildSchoolResourceWhere,
  buildTeacherResourceWhere,
} from "@/lib/resource-access-policy";

export interface TeacherAccessRecord {
  id: string;
  active: boolean;
  schoolId: string | null;

  school: {
    status: string;
    publisherId: string | null;

    publisher: {
      active: boolean;
    } | null;
  } | null;

  schoolMemberships: Array<{
    schoolId: string;
    active: boolean;
    status: string;
  }>;
}

export interface SchoolAccessRecord {
  id: string;
  status: string;
  publisherId: string | null;

  publisher: {
    active: boolean;
  } | null;
}

export interface TeacherAssignmentScope {
  sectionId: string;
  subjectId: string | null;
  academicYearId: string;
}

export interface EntitledSectionSubjectRecord {
  id: string;
  bookId: string | null;
}

export interface ResourceAccessRecord {
  id: string;
  publisherId: string | null;
  title: string;
  description: string;
  subject: string;
  classLevel: string;
  type: ResourceType;
  fileUrl: string;
  audience: ResourceAudience;
  thumbnail: string | null;
  featured: boolean;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceAccessDependencies {
  findTeacher(
    userId: string,
  ): Promise<
    TeacherAccessRecord | null
  >;

  findTeacherAssignments(
    teacherId: string,
    schoolId: string,
  ): Promise<
    TeacherAssignmentScope[]
  >;

  findEntitledSectionSubjects(
    assignments:
      TeacherAssignmentScope[],
  ): Promise<
    EntitledSectionSubjectRecord[]
  >;

  findSchool(
    userId: string,
  ): Promise<
    SchoolAccessRecord | null
  >;

  isResourcesEnabled(
    publisherId: string,
  ): Promise<boolean>;

  findResource(
    where:
      Prisma.ResourceWhereInput,
  ): Promise<
    ResourceAccessRecord | null
  >;
}

export async function getTeacherResourceScopeWithDependencies(
  userId: string,
  dependencies:
    ResourceAccessDependencies,
) {
  const result =
    await getTeacherResourceAccessWithDependencies(
      userId,
      dependencies,
    );

  if (
    result.status !==
    "READY"
  ) {
    return null;
  }

  return result.resourceScope;
}

export type TeacherResourceAccessResult =
  | {
      status: "READY";

      resourceScope: {
        teacher:
          TeacherAccessRecord;

        where:
          Prisma.ResourceWhereInput;
      };
    }
  | {
      status:
        "INVALID_SCOPE";
    }
  | {
      status:
        "RESOURCES_DISABLED";
    }
  | {
      status:
        "NO_ASSIGNMENTS";
    }
  | {
      status:
        "NO_ENTITLEMENTS";
    };

export async function getTeacherResourceAccessWithDependencies(
  userId: string,
  dependencies:
    ResourceAccessDependencies,
): Promise<TeacherResourceAccessResult> {
  const teacher =
    await dependencies.findTeacher(
      userId,
    );

  if (
    !teacher?.active ||
    !teacher.schoolId ||
    teacher.school?.status !==
      "APPROVED" ||
    !teacher.schoolMemberships.some(
      (membership) =>
        membership.schoolId ===
          teacher.schoolId &&
        membership.active &&
        membership.status ===
          "ACTIVE",
    ) ||
    !teacher.school
      ?.publisherId ||
    !teacher.school.publisher
      ?.active
  ) {
    return {
      status:
        "INVALID_SCOPE",
    };
  }

  const publisherId =
    teacher.school.publisherId;

  if (
    !(await dependencies.isResourcesEnabled(
      publisherId,
    ))
  ) {
    return {
      status:
        "RESOURCES_DISABLED",
    };
  }

  const assignments =
    await dependencies.findTeacherAssignments(
      teacher.id,
      teacher.schoolId,
    );

  if (
    !assignments.length
  ) {
    return {
      status:
        "NO_ASSIGNMENTS",
    };
  }

  const sectionSubjects =
    await dependencies.findEntitledSectionSubjects(
      assignments,
    );

  if (
    !sectionSubjects.length
  ) {
    return {
      status:
        "NO_ENTITLEMENTS",
    };
  }

  const sectionSubjectIds =
    sectionSubjects.map(
      (item) => item.id,
    );

  /*
   * Smart Book access is derived from the books
   * attached to the teacher's assigned
   * SectionSubjects.
   */
  const bookIds = [
    ...new Set(
      sectionSubjects
        .map(
          (item) =>
            item.bookId,
        )
        .filter(
          (
            value,
          ): value is string =>
            typeof value ===
              "string" &&
            value.length > 0,
        ),
    ),
  ];

  return {
    status: "READY",

    resourceScope: {
      teacher,

      where:
        buildTeacherResourceWhere(
          publisherId,
          teacher.schoolId,
          sectionSubjectIds,
          bookIds,
        ),
    },
  };
}

export async function requireTeacherResourceAccessWithDependencies(
  userId: string,
  resourceId: string,
  dependencies:
    ResourceAccessDependencies,
) {
  const scope =
    await getTeacherResourceScopeWithDependencies(
      userId,
      dependencies,
    );

  if (!scope) {
    return null;
  }

  const resource =
    await dependencies.findResource({
      id: resourceId,
      ...scope.where,
    });

  return resource
    ? {
        teacher:
          scope.teacher,

        resource,
      }
    : null;
}

export async function getSchoolResourceScopeWithDependencies(
  userId: string,
  dependencies:
    ResourceAccessDependencies,
) {
  const school =
    await dependencies.findSchool(
      userId,
    );

  if (
    !school?.publisherId ||
    school.status !==
      "APPROVED" ||
    !school.publisher
      ?.active
  ) {
    return null;
  }

  if (
    !(await dependencies.isResourcesEnabled(
      school.publisherId,
    ))
  ) {
    return null;
  }

  return {
    school,

    where:
      buildSchoolResourceWhere(
        school.publisherId,
        school.id,
      ),
  };
}

export async function requireSchoolResourceAccessWithDependencies(
  userId: string,
  resourceId: string,
  dependencies:
    ResourceAccessDependencies,
) {
  const scope =
    await getSchoolResourceScopeWithDependencies(
      userId,
      dependencies,
    );

  if (!scope) {
    return null;
  }

  const resource =
    await dependencies.findResource({
      id: resourceId,
      ...scope.where,
    });

  return resource
    ? {
        school:
          scope.school,

        resource,
      }
    : null;
}