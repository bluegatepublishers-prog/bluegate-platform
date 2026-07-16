import type { Prisma, ResourceAudience, ResourceType } from "@prisma/client";
import {
  buildSchoolResourceWhere,
  buildTeacherResourceWhere,
} from "@/lib/resource-access-policy";

export interface TeacherAccessRecord {
  id: string;
  active: boolean;
  schoolId: string | null;
  school: {
    publisherId: string | null;
    publisher: { active: boolean } | null;
  } | null;
}

export interface SchoolAccessRecord {
  id: string;
  publisherId: string | null;
  publisher: { active: boolean } | null;
}

export interface TeacherAssignmentScope {
  sectionId: string;
  subjectId: string | null;
  academicYearId: string;
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
  findTeacher(userId: string): Promise<TeacherAccessRecord | null>;
  findTeacherAssignments(
    teacherId: string,
    schoolId: string,
  ): Promise<TeacherAssignmentScope[]>;
  findEntitledSectionSubjects(
    assignments: TeacherAssignmentScope[],
    schoolId: string,
    publisherId: string,
  ): Promise<Array<{ id: string }>>;
  findSchool(userId: string): Promise<SchoolAccessRecord | null>;
  isResourcesEnabled(publisherId: string): Promise<boolean>;
  findResource(where: Prisma.ResourceWhereInput): Promise<ResourceAccessRecord | null>;
}

export async function getTeacherResourceScopeWithDependencies(
  userId: string,
  dependencies: ResourceAccessDependencies,
) {
  const teacher = await dependencies.findTeacher(userId);
  if (
    !teacher?.active ||
    !teacher.schoolId ||
    !teacher.school?.publisherId ||
    !teacher.school.publisher?.active
  ) {
    return null;
  }

  const publisherId = teacher.school.publisherId;
  if (!(await dependencies.isResourcesEnabled(publisherId))) return null;
  const assignments = await dependencies.findTeacherAssignments(
    teacher.id,
    teacher.schoolId,
  );
  if (!assignments.length) return null;
  const sectionSubjects = await dependencies.findEntitledSectionSubjects(
    assignments,
    teacher.schoolId,
    publisherId,
  );
  if (!sectionSubjects.length) return null;

  return {
    teacher,
    where: buildTeacherResourceWhere(
      publisherId,
      sectionSubjects.map((item) => item.id),
    ),
  };
}

export async function requireTeacherResourceAccessWithDependencies(
  userId: string,
  resourceId: string,
  dependencies: ResourceAccessDependencies,
) {
  const scope = await getTeacherResourceScopeWithDependencies(userId, dependencies);
  if (!scope) return null;
  const resource = await dependencies.findResource({
    id: resourceId,
    ...scope.where,
  });
  return resource ? { teacher: scope.teacher, resource } : null;
}

export async function getSchoolResourceScopeWithDependencies(
  userId: string,
  dependencies: ResourceAccessDependencies,
) {
  const school = await dependencies.findSchool(userId);
  if (!school?.publisherId || !school.publisher?.active) return null;
  if (!(await dependencies.isResourcesEnabled(school.publisherId))) return null;
  return {
    school,
    where: buildSchoolResourceWhere(school.publisherId, school.id),
  };
}

export async function requireSchoolResourceAccessWithDependencies(
  userId: string,
  resourceId: string,
  dependencies: ResourceAccessDependencies,
) {
  const scope = await getSchoolResourceScopeWithDependencies(userId, dependencies);
  if (!scope) return null;
  const resource = await dependencies.findResource({
    id: resourceId,
    ...scope.where,
  });
  return resource ? { school: scope.school, resource } : null;
}
