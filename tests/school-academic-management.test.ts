import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAcademicCoverage,
  getSchoolProfileCompleteness,
  normalizePositivePage,
} from "../lib/school-academic-management";

test("academic coverage counts unique class and subject assignments", () => {
  const coverage = buildAcademicCoverage({
    sections: [{ id: "a" }, { id: "b" }],
    sectionSubjects: [
      { sectionId: "a", subjectId: "math" },
      { sectionId: "a", subjectId: "science" },
      { sectionId: "b", subjectId: "math" },
    ],
    assignments: [
      { sectionId: "a", subjectId: null, type: "CLASS_TEACHER" },
      { sectionId: "a", subjectId: null, type: "CLASS_TEACHER" },
      { sectionId: "a", subjectId: "math", type: "SUBJECT_TEACHER" },
      { sectionId: "a", subjectId: "math", type: "SUBJECT_TEACHER" },
      { sectionId: "foreign", subjectId: "science", type: "SUBJECT_TEACHER" },
    ],
  });

  assert.deepEqual(coverage, {
    sections: 2,
    offeredSubjects: 2,
    sectionSubjects: 3,
    classTeachers: 1,
    subjectTeachers: 1,
    activeAssignments: 2,
    missingClassTeachers: 1,
    missingSubjectTeachers: 2,
  });
});

test("profile completeness uses only persisted supported fields", () => {
  const result = getSchoolProfileCompleteness({
    schoolName: "Bluegate School",
    principalName: "",
    address: "1 Learning Road",
    city: "Delhi",
    state: "Delhi",
    pincode: null,
    phone: "9999999999",
    email: "school@example.com",
  });

  assert.equal(result.percent, 75);
  assert.equal(result.complete, false);
  assert.deepEqual(result.missing, ["Principal name", "Pincode"]);
});

test("student pagination rejects malformed and non-positive pages", () => {
  assert.equal(normalizePositivePage(undefined), 1);
  assert.equal(normalizePositivePage("invalid"), 1);
  assert.equal(normalizePositivePage("0"), 1);
  assert.equal(normalizePositivePage(3), 3);
});
