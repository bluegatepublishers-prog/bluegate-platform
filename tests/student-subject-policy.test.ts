import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStudentSubjectViewModels,
  findStudentSubjectViewModel,
  type StudentSubjectCandidate,
  type StudentSubjectContext,
} from "../lib/student-subject-policy";

const context: StudentSubjectContext = {
  schoolId: "school-1",
  publisherId: "publisher-1",
  academicYearId: "year-1",
  schoolClassId: "class-1",
  className: "Class 6",
  sectionId: "section-1",
  resourcesEnabled: true,
};

function candidate(overrides: Partial<StudentSubjectCandidate> = {}): StudentSubjectCandidate {
  return {
    id: "section-subject-1",
    sectionId: "section-1",
    active: true,
    sortOrder: 1,
    subject: { id: "subject-1", name: "Science", code: "SCIENCE", active: true },
    adoptions: [{
      schoolId: "school-1",
      publisherId: "publisher-1",
      academicYearId: "year-1",
      schoolClassId: "class-1",
      sectionId: "section-1",
      sectionSubjectId: "section-subject-1",
      status: "APPROVED",
      active: true,
      book: {
        id: "book-1",
        publisherId: "publisher-1",
        subjectId: "subject-1",
        title: "Science Explorer",
        coverImage: null,
        published: true,
        class: { name: "Grade 6" },
        subject: { name: "Science" },
        series: { name: "Explorer" },
      },
    }],
    resources: [
      { id: "student", publisherId: "publisher-1", title: "Student PDF", description: "Notes", subject: "Science", classLevel: "Class 6", type: "PDF", audience: "STUDENT", thumbnail: null, published: true },
      { id: "both", publisherId: "publisher-1", title: "Shared video", description: "Video", subject: "Science", classLevel: "Grade 6", type: "VIDEO", audience: "BOTH", thumbnail: null, published: true },
      { id: "teacher", publisherId: "publisher-1", title: "Teacher notes", description: "Private", subject: "Science", classLevel: "Class 6", type: "PDF", audience: "TEACHER_ONLY", thumbnail: null, published: true },
    ],
    assignments: [{
      schoolId: "school-1",
      academicYearId: "year-1",
      schoolClassId: "class-1",
      sectionId: "section-1",
      subjectId: "subject-1",
      type: "SUBJECT_TEACHER",
      active: true,
      teacher: { active: true, schoolId: "school-1", user: { name: "Ms Rao" } },
    }],
    ...overrides,
  };
}

test("valid enrollment context returns only subjects in the enrolled section", () => {
  const result = buildStudentSubjectViewModels(context, [candidate(), candidate({ id: "foreign", sectionId: "section-2" })]);
  assert.deepEqual(result.map((item) => item.sectionSubjectId), ["section-subject-1"]);
});

test("direct foreign sectionSubjectId is denied", () => {
  assert.equal(findStudentSubjectViewModel(context, [candidate()], "foreign"), null);
});

test("inactive section subject and inactive subject are excluded", () => {
  assert.equal(buildStudentSubjectViewModels(context, [candidate({ active: false })]).length, 0);
  assert.equal(buildStudentSubjectViewModels(context, [candidate({ subject: { ...candidate().subject, active: false } })]).length, 0);
});

test("subject without approved adoption remains visible", () => {
  const [subject] = buildStudentSubjectViewModels(context, [candidate({ adoptions: [] })]);
  assert.equal(subject.hasApprovedBook, false);
  assert.equal(subject.book, null);
  assert.equal(subject.totalStudentResources, 0);
});

test("approved same-year book is included without consulting premium", () => {
  const [subject] = buildStudentSubjectViewModels(context, [candidate()]);
  assert.equal(subject.book?.id, "book-1");
  assert.equal("premium" in context, false);
});

for (const status of ["PENDING", "REJECTED", "REVOKED"]) {
  test(`${status.toLowerCase()} adoption is excluded`, () => {
    const base = candidate();
    const [subject] = buildStudentSubjectViewModels(context, [candidate({ adoptions: [{ ...base.adoptions[0], status }] })]);
    assert.equal(subject.book, null);
  });
}

test("prior-year and wrong-publisher approvals are excluded", () => {
  const base = candidate();
  for (const adoption of [
    { ...base.adoptions[0], academicYearId: "year-0" },
    { ...base.adoptions[0], publisherId: "publisher-2" },
  ]) {
    assert.equal(buildStudentSubjectViewModels(context, [candidate({ adoptions: [adoption] })])[0].book, null);
  }
});

test("STUDENT and BOTH resources are included while TEACHER_ONLY is excluded", () => {
  const [subject] = buildStudentSubjectViewModels(context, [candidate()]);
  assert.deepEqual(subject.resources.map((resource) => resource.id), ["student", "both"]);
  assert.equal(subject.resourceCounts.pdfs, 1);
  assert.equal(subject.resourceCounts.videos, 1);
});

test("cross-publisher, wrong-subject, wrong-class, and unpublished resources are excluded", () => {
  const base = candidate();
  const resources = [
    { ...base.resources[0], id: "publisher", publisherId: "publisher-2" },
    { ...base.resources[0], id: "subject", subject: "Mathematics" },
    { ...base.resources[0], id: "class", classLevel: "Class 7" },
    { ...base.resources[0], id: "draft", published: false },
  ];
  assert.equal(buildStudentSubjectViewModels(context, [candidate({ resources })])[0].resources.length, 0);
});

test("no approved adoption excludes book-scoped resources", () => {
  assert.equal(buildStudentSubjectViewModels(context, [candidate({ adoptions: [] })])[0].resources.length, 0);
});

test("disabled RESOURCES feature returns no usable resources", () => {
  assert.equal(buildStudentSubjectViewModels({ ...context, resourcesEnabled: false }, [candidate()])[0].resources.length, 0);
});

test("only an active matching subject teacher is displayed", () => {
  assert.equal(buildStudentSubjectViewModels(context, [candidate()])[0].teacherName, "Ms Rao");
  const base = candidate();
  const [subject] = buildStudentSubjectViewModels(context, [candidate({ assignments: [{ ...base.assignments[0], type: "CLASS_TEACHER" }] })]);
  assert.equal(subject.teacherName, null);
});
