import assert from "node:assert/strict";
import test from "node:test";
import { ResourceAudience, ResourceType } from "@prisma/client";
import {
  requireSchoolResourceAccessWithDependencies,
  requireTeacherResourceAccessWithDependencies,
  type ResourceAccessDependencies,
} from "../lib/resource-access-service";
import {
  buildActiveTeacherAssignmentsWhere,
  buildEntitledSectionSubjectsWhere,
  buildSchoolResourceWhere,
} from "../lib/resource-access-policy";

const ids = {
  publisherA: "publisher-a",
  publisherB: "publisher-b",
  schoolA: "school-a",
  teacherA: "teacher-a",
  teacherUserA: "teacher-user-a",
  schoolUserA: "school-user-a",
  resource: "resource-a",
  section: "section-a",
  sectionSubject: "section-subject-a",
  subject: "subject-a",
  year: "academic-year-a",
};

interface AccessScenario {
  teacherActive?: boolean;
  publisherActive?: boolean;
  featureEnabled?: boolean;
  activeAssignment?: boolean;
  activeAcademicContext?: boolean;
  subjectMatches?: boolean;
  sectionSubjectMatches?: boolean;
  resourcePublisherId?: string;
  resourcePublished?: boolean;
  resourceLinked?: boolean;
  resourceAudience?: ResourceAudience;
  schoolAcademicContextMatches?: boolean;
}

function accessDependencies(scenario: AccessScenario = {}) {
  const config = {
    teacherActive: true,
    publisherActive: true,
    featureEnabled: true,
    activeAssignment: true,
    activeAcademicContext: true,
    subjectMatches: true,
    sectionSubjectMatches: true,
    resourcePublisherId: ids.publisherA,
    resourcePublished: true,
    resourceLinked: true,
    resourceAudience: ResourceAudience.TEACHER_ONLY,
    schoolAcademicContextMatches: true,
    ...scenario,
  };
  const resource = {
    id: ids.resource,
    publisherId: config.resourcePublisherId,
    title: "Resource Teacher Only",
    description: "Fixture resource",
    subject: "Science",
    classLevel: "Class 6",
    type: ResourceType.PDF,
    audience: config.resourceAudience,
    fileUrl: "https://files.invalid/protected/resource.pdf",
    thumbnail: null,
    featured: false,
    published: config.resourcePublished,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  const observedResourceWheres: unknown[] = [];

  const dependencies = {
    async findTeacher() {
      return {
        id: ids.teacherA,
        userId: ids.teacherUserA,
        active: config.teacherActive,
        schoolId: ids.schoolA,
        school: {
          id: ids.schoolA,
          status: "APPROVED",
          publisherId: ids.publisherA,
          publisher: { id: ids.publisherA, active: config.publisherActive },
        },
        schoolMemberships: [{ schoolId: ids.schoolA, active: true, status: "ACTIVE" }],
      };
    },
    async findTeacherAssignments() {
      return config.activeAssignment && config.activeAcademicContext
        ? [
            {
              sectionId: ids.section,
              subjectId: config.subjectMatches ? ids.subject : "subject-b",
              academicYearId: ids.year,
            },
          ]
        : [];
    },
    async findEntitledSectionSubjects() {
      return config.subjectMatches &&
        config.sectionSubjectMatches
        ? [{ id: ids.sectionSubject }]
        : [];
    },
    async findSchool() {
      return {
        id: ids.schoolA,
        userId: ids.schoolUserA,
        status: "APPROVED",
        publisherId: ids.publisherA,
        publisher: { id: ids.publisherA, active: config.publisherActive },
      };
    },
    async isResourcesEnabled() {
      return config.featureEnabled;
    },
    async findResource(where: Record<string, unknown>) {
      observedResourceWheres.push(where);
      const samePublisher = where.publisherId === config.resourcePublisherId;
      return samePublisher &&
        config.resourcePublished &&
        config.resourceLinked &&
        config.schoolAcademicContextMatches
        ? resource
        : null;
    },
  } as unknown as ResourceAccessDependencies;

  return { dependencies, observedResourceWheres };
}

for (const [name, scenario] of [
  ["inactive teacher", { teacherActive: false }],
  ["inactive publisher-school context", { publisherActive: false }],
  ["RESOURCES feature disabled", { featureEnabled: false }],
  ["no active academic context", { activeAcademicContext: false }],
  ["no active assignment", { activeAssignment: false }],
  ["wrong subject", { subjectMatches: false }],
  ["no matching SectionSubject", { sectionSubjectMatches: false }],
] as const) {
  test(`teacher access denies ${name}`, async () => {
    const { dependencies } = accessDependencies(scenario);
    assert.equal(
      await requireTeacherResourceAccessWithDependencies(
        ids.teacherUserA,
        ids.resource,
        dependencies,
      ),
      null,
    );
  });
}

test("teacher access denies a resource owned by Publisher B", async () => {
  const { dependencies, observedResourceWheres } = accessDependencies({
    resourcePublisherId: ids.publisherB,
  });
  assert.equal(
    await requireTeacherResourceAccessWithDependencies(
      ids.teacherUserA,
      ids.resource,
      dependencies,
    ),
    null,
  );
  assert.equal(
    (observedResourceWheres[0] as { publisherId: string }).publisherId,
    ids.publisherA,
  );
});

for (const audience of Object.values(ResourceAudience)) {
  test(`teacher access allows ${audience} after current subject and resource assignment checks`, async () => {
    const { dependencies } = accessDependencies({ resourceAudience: audience });
    const access = await requireTeacherResourceAccessWithDependencies(
      ids.teacherUserA,
      ids.resource,
      dependencies,
    );
    assert.equal(access?.resource.audience, audience);
  });
}

test("teacher assignment query requires active school, year, class, section, and subject assignment", () => {
  assert.deepEqual(
    buildActiveTeacherAssignmentsWhere(ids.teacherA, ids.schoolA),
    {
      teacherId: ids.teacherA,
      schoolId: ids.schoolA,
      active: true,
      subjectId: { not: null },
      academicYear: { active: true, current: true },
      schoolClass: { active: true },
      section: { active: true },
    },
  );
});

test("teacher resource query binds the current assigned section and subject", () => {
  const where = buildEntitledSectionSubjectsWhere(
    [
      {
        sectionId: ids.section,
        subjectId: ids.subject,
        academicYearId: ids.year,
      },
    ],
  );
  assert.deepEqual(where.OR, [
    {
      sectionId: ids.section,
      subjectId: ids.subject,
    },
  ]);
});

test("school access allows matching publisher and assigned current academic context", async () => {
  const { dependencies } = accessDependencies();
  const access = await requireSchoolResourceAccessWithDependencies(
    ids.schoolUserA,
    ids.resource,
    dependencies,
  );
  assert.equal(access?.resource.id, ids.resource);
});

for (const [name, scenario] of [
  ["wrong publisher", { resourcePublisherId: ids.publisherB }],
  ["feature disabled", { featureEnabled: false }],
  ["unrelated academic context", { schoolAcademicContextMatches: false }],
  ["direct resource ID from another tenant", { resourcePublisherId: ids.publisherB }],
] as const) {
  test(`school access denies ${name}`, async () => {
    const { dependencies } = accessDependencies(scenario);
    assert.equal(
      await requireSchoolResourceAccessWithDependencies(
        ids.schoolUserA,
        ids.resource,
        dependencies,
      ),
      null,
    );
  });
}

test("school query binds assigned resources to the current school context", () => {
  const where = buildSchoolResourceWhere(ids.publisherA, ids.schoolA);
  assert.equal(where.publisherId, ids.publisherA);
  const section = where.sectionSubjects?.some;
  assert.deepEqual(section, {
    active: true,
    section: {
      active: true,
      schoolClass: {
        schoolId: ids.schoolA,
        active: true,
        academicYear: { active: true, current: true },
      },
    },
  });
});
