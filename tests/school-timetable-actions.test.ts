import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseTimeMinutes } from "../lib/timetable-time";
import { parseCompleteTimetableForm } from "../lib/school-timetable-form";

const actions = readFileSync("app/school-dashboard/timetable/actions.ts", "utf8");
const schoolPage = readFileSync("app/school-dashboard/timetable/page.tsx", "utf8");
const service = readFileSync("lib/school-timetable.ts", "utf8");

test("timetable parser converts strict browser HH:mm values to wall-clock minutes", () => {
  assert.equal(parseTimeMinutes("08:00"), 480);
  assert.equal(parseTimeMinutes("14:00"), 840);
  assert.equal(parseTimeMinutes("00:00"), 0);
  assert.equal(parseTimeMinutes("23:59"), 1439);
});

test("timetable parser rejects invalid or non-canonical values", () => {
  for (const value of ["", "8:00", "24:00", "12:60", "abc", "08:00:00"]) {
    assert.throws(() => parseTimeMinutes(value), /Enter a valid time\./);
  }
});

test("timetable actions use the centralized parser for school timing and period slots", () => {
  assert.match(actions, /schoolStartMinute: parseTimeMinutes\(value\(form, "schoolStartMinute"\)\)/);
  assert.match(actions, /schoolEndMinute: parseTimeMinutes\(value\(form, "schoolEndMinute"\)\)/);
  assert.match(actions, /startMinute: parseTimeMinutes\(value\(form, "startMinute"\)\)/);
  assert.match(actions, /endMinute: parseTimeMinutes\(value\(form, "endMinute"\)\)/);
  assert.doesNotMatch(actions, /timeMinutes\(/);
  assert.doesNotMatch(actions, /\\\\d\{2\}/);
  assert.equal(parseTimeMinutes("08:40") - parseTimeMinutes("08:00"), 40);
});
test("timetable configuration submits working days and preserves the selected seasonal config", () => {
  assert.ok(schoolPage.includes('name="workingDays"'));
  assert.ok(schoolPage.includes('name="configId"'));
  assert.ok(actions.includes('configId: value(form, "configId") || undefined'));
  assert.ok(service.includes('where: { id: input.configId, schoolId: school.id, academicYearId: input.academicYearId }'));
  assert.ok(service.includes('currentConfig ? tx.schoolTimetableConfig.update({ where: { id: currentConfig.id }'));
});

test("seasonal slot and complete-grid saves require the selected timetable configuration", () => {
  assert.ok(actions.includes('timetableConfigId: value(form, "timetableConfigId")'));
  assert.ok(service.includes('async function configFor'));
  assert.ok(service.includes('id: timetableConfigId'));
  assert.ok(service.includes('timetableConfigId ? configs.find((item) => item.id === timetableConfigId) ?? null'));
  assert.ok(service.includes('entry.timetableConfigId !== config.id'));
  assert.ok(schoolPage.includes('const visibleDays = WEEKDAYS.filter'));
  assert.ok(schoolPage.includes('visibleDays.map'));
  assert.ok(!schoolPage.includes('currentDays.includes(day) ? "text-slate-700" : "text-slate-300"'));
});

test("complete-grid subject and teacher selections are submitted as one persisted cell value", () => {
  assert.ok(schoolPage.includes('name={field}'));
  assert.ok(schoolPage.includes('defaultValue={entry ? `${entry.sectionSubjectId}|${entry.teacherAssignmentId}` : "|"}'));
  assert.ok(schoolPage.includes('value={`${subject.id}|${assignment.id}`}'));
  assert.ok(actions.includes('parseCompleteTimetableForm(form)'));
  assert.ok(service.includes('const staleIds = existing.filter'));
  assert.ok(service.indexOf('deleteMany({ where: { schoolId: school.id, id: { in: staleIds } } })') < service.indexOf('tx.classTimetableEntry.create({'));
});

test("complete timetable FormData normalizes one selected subject-teacher cell", () => {
  const form = new FormData();
  form.set("academicYearId", "year-2026");
  form.set("timetableConfigId", "config-default");
  form.set("sectionId", "section-3-a");
  form.set("cell:MONDAY:period-1", "section-subject-evs|teacher-assignment-vikas");
  form.set("cell:TUESDAY:period-1", "|");

  assert.deepEqual(parseCompleteTimetableForm(form), {
    academicYearId: "year-2026",
    timetableConfigId: "config-default",
    sectionId: "section-3-a",
    entries: [{
      academicYearId: "year-2026",
      timetableConfigId: "config-default",
      sectionId: "section-3-a",
      weekday: "MONDAY",
      periodSlotId: "period-1",
      sectionSubjectId: "section-subject-evs",
      teacherAssignmentId: "teacher-assignment-vikas",
    }],
  });
});

test("complete timetable FormData rejects malformed compact selections", () => {
  const form = new FormData();
  form.set("academicYearId", "year-2026");
  form.set("timetableConfigId", "config-default");
  form.set("sectionId", "section-3-a");
  form.set("cell:MONDAY:period-1", "section-subject-evs|teacher|extra");
  assert.throws(() => parseCompleteTimetableForm(form), /valid subject and teacher/);
});

test("period slot forms submit the exact scoped slot contract and clear stale mutation errors", () => {
  assert.ok(schoolPage.includes('name="timetableConfigId"'));
  assert.ok(schoolPage.includes('name="sectionId"'));
  assert.ok(schoolPage.includes('name="label"'));
  assert.ok(schoolPage.includes('name="sequence"'));
  assert.ok(schoolPage.includes('name="startMinute"'));
  assert.ok(schoolPage.includes('name="endMinute"'));
  assert.ok(schoolPage.includes('name="type"'));
  assert.ok(actions.includes('redirectToTimetable(form, true)'));
  assert.ok(actions.includes('query.set("saved", "1")'));
});

test("slot validation keeps adjacency valid and rejects overlap and out-of-day ranges", () => {
  assert.ok(service.includes('if (input.startMinute < config.schoolStartMinute || input.endMinute > config.schoolEndMinute) fail("Period slot must fit inside the School day.")'));
  assert.ok(service.includes('input.startMinute < slot.endMinute && input.endMinute > slot.startMinute'));
  assert.ok(service.includes('That slot sequence is already in use.'));
});

test("complete timetable saves allow the sequential Prisma transaction enough time", () => {
  assert.ok(service.includes('isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000'));
  assert.ok(service.includes('Timetable save took too long. Please try again.'));
  assert.ok(service.includes('isClosedTransactionError'));
});
