import assert from "node:assert/strict";
import test from "node:test";
import { assignmentKeys, canAccessMentorAssignment, learningTrend, validMentorNote } from "../lib/mentor-policy";

const eligible = { status: "ACTIVE" as const, startsAt: new Date("2026-01-01"), endsAt: null, assignmentPublisherId: "publisher-a", mentorPublisherId: "publisher-a", schoolPublisherId: "publisher-a", assignmentSchoolId: "school-a", studentSchoolId: "school-a", assignmentAcademicYearId: "year-a", enrollmentAcademicYearId: "year-a", plan: "INDIVIDUAL_PREMIUM_MENTOR", mentorActive: true, publisherActive: true, mentorFeatureEnabled: true };

test("eligible current Mentor-plan assignment is allowed", () => assert.equal(canAccessMentorAssignment(eligible, new Date("2026-07-16")), true));
test("wrong mentor, publisher, school, year, plan, feature, status and period fail closed", () => {
  for (const change of [{ mentorPublisherId: "publisher-b" }, { schoolPublisherId: "publisher-b" }, { studentSchoolId: "school-b" }, { enrollmentAcademicYearId: "year-b" }, { plan: "INDIVIDUAL_PREMIUM" }, { mentorFeatureEnabled: false }, { mentorActive: false }, { publisherActive: false }, { status: "REVOKED" as const }, { startsAt: new Date("2027-01-01") }, { endsAt: new Date("2026-01-02") }]) assert.equal(canAccessMentorAssignment({ ...eligible, ...change }, new Date("2026-07-16")), false);
});
test("primary assignment keys enforce one current primary while supporting remains future-compatible", () => { assert.deepEqual(assignmentKeys("student", "year", "mentor", "PRIMARY"), { activeKey: "mentor:student:year", activePrimaryKey: "student:year:PRIMARY" }); assert.equal(assignmentKeys("student", "year", "mentor-2", "SUPPORTING").activePrimaryKey, null); });
test("mentor notes are normalized and bounded", () => { assert.equal(validMentorNote("  Keep   practising fractions.  "), "Keep practising fractions."); assert.equal(validMentorNote("tiny"), null); assert.equal(validMentorNote("x".repeat(2001)), null); });
test("mentor report trend is deterministic and honest about missing evidence", () => { assert.equal(learningTrend(null, null, null), "Not enough evidence"); assert.equal(learningTrend(80, 75, 90), "Steady progress"); assert.equal(learningTrend(55, 60, null), "Developing"); assert.equal(learningTrend(20, 40, 45), "Needs support"); });
