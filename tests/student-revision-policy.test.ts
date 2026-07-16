import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStudentRevisionContent,
  validateRevisionChecklist,
  type ApprovedRevisionChapter,
} from "../lib/student-revision-policy";

function chapter(overrides: Partial<ApprovedRevisionChapter> = {}): ApprovedRevisionChapter {
  return {
    id: "chapter-1",
    chapterNumber: 1,
    title: "Plants Around Us",
    summary: "Approved summary.",
    keywords: ["Stem", "root", "Stem", "  leaf  "],
    learningOutcomes: [{ id: "outcome-1", outcome: "Identify the main parts of a plant.", bloomLevel: "REMEMBER", competency: null }],
    questions: [
      { id: "card-1", questionText: "What anchors a plant?", correctAnswer: "The roots.", explanation: "Roots hold the plant in soil." },
      { id: "no-answer", questionText: "Unanswered question", correctAnswer: null, explanation: null },
    ],
    activities: [{ id: "activity-1", title: "Observe a leaf", objective: "Observe leaf parts.", instructions: "Look closely.", expectedLearning: "Name the parts." }],
    ...overrides,
  };
}

test("revision content projects only stored structured chapter knowledge", () => {
  const result = buildStudentRevisionContent(chapter());
  assert.equal(result.summary, "Approved summary.");
  assert.deepEqual(result.keyPoints.map((item) => item.text), ["Identify the main parts of a plant."]);
  assert.deepEqual(result.quickRevisionCards.map((item) => item.id), ["card-1"]);
  assert.equal(result.activities[0].title, "Observe a leaf");
});

test("keywords are trimmed, deduplicated, alphabetized, and never receive invented definitions", () => {
  const result = buildStudentRevisionContent(chapter());
  assert.deepEqual(result.keywords, [
    { keyword: "leaf", definition: null },
    { keyword: "root", definition: null },
    { keyword: "Stem", definition: null },
  ]);
});

test("unsupported structured categories remain honestly empty and mind map remains unavailable", () => {
  const result = buildStudentRevisionContent(chapter());
  assert.deepEqual(result.formulae, []);
  assert.deepEqual(result.importantDates, []);
  assert.deepEqual(result.definitions, []);
  assert.deepEqual(result.rememberBoxes, []);
  assert.deepEqual(result.commonMistakes, []);
  assert.deepEqual(result.didYouKnow, []);
  assert.equal(result.mindMap, null);
});

test("missing or whitespace-only summary is not replaced with generated text", () => {
  assert.equal(buildStudentRevisionContent(chapter({ summary: "  " })).summary, null);
});

test("revision checklist accepts exactly four boolean completion states", () => {
  const valid = { summaryRead: true, keywordsRead: false, mindMapRead: false, revisionCompleted: true };
  assert.deepEqual(validateRevisionChecklist(valid), valid);
  assert.equal(validateRevisionChecklist({ ...valid, studentId: "browser-student" }), null);
  assert.equal(validateRevisionChecklist({ ...valid, summaryRead: "yes" }), null);
  assert.equal(validateRevisionChecklist(null), null);
});
